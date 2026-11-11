/* SpeechPlayer — a continuous Bible narration engine built on the Web Speech
 * API. It speaks verse-by-verse, auto-advances through the chapter (and into
 * the next chapter when enabled), and reports its position so the UI can
 * highlight the verse being read.
 *
 * Known platform limits (handled honestly in the UI):
 *  - If window.speechSynthesis is missing, `supported` is false.
 *  - Some browsers (notably Chrome on Android) do not implement pause();
 *    we detect that and fall back to cancel + restart-from-verse on resume.
 *  - iOS Safari pauses speech when the tab goes to the background.
 */

import type { BookData } from '@/types'
import { loadBook, loadIndex, bookMeta, nextChapter } from '@/lib/bible'

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'ended'

export interface PlayerPosition {
  book: number
  chapter: number
  verse: number
}

type Listener = () => void

export interface VoiceInfo {
  name: string
  uri: string
  lang: string
}

class SpeechPlayer {
  readonly supported: boolean

  status: PlayerStatus = 'idle'
  position: PlayerPosition | null = null
  rate = 1
  voiceURI: string | null = null
  autoChapter = true

  /** Play a single verse (used by the Daily verse listen button). */
  private single = false
  /** True when a soft pause was emulated via cancel(). */
  private softPaused = false
  private chapter: BookData | null = null
  private cancelToken = 0
  private speakHeader = false
  private wakeLock: WakeLockSentinel | null = null
  private listeners = new Set<Listener>()

  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private emit() {
    for (const l of this.listeners) l()
  }

  /* Voice list ------------------------------------------------------------ */

  voices(): VoiceInfo[] {
    if (!this.supported) return []
    const all = window.speechSynthesis.getVoices()
    const mapped = all.map((v) => ({ name: v.name, uri: v.voiceURI, lang: v.lang }))
    // Prefer English voices first, keeping the rest reachable.
    const en = mapped.filter((v) => v.lang.toLowerCase().startsWith('en'))
    const rest = mapped.filter((v) => !v.lang.toLowerCase().startsWith('en'))
    return [...en, ...rest]
  }

  refreshVoices(cb?: () => void) {
    if (!this.supported) return
    const synth = window.speechSynthesis
    if (synth.getVoices().length) {
      this.emit()
      cb?.()
    }
    synth.addEventListener?.('voiceschanged', () => {
      this.emit()
      cb?.()
    }, { once: true })
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const all = window.speechSynthesis.getVoices()
    if (this.voiceURI) {
      const v = all.find((x) => x.voiceURI === this.voiceURI)
      if (v) return v
    }
    return null
  }

  /* Transport -------------------------------------------------------------- */

  /** Start reading at a position. opts.single stops after that one verse. */
  async start(pos: PlayerPosition, opts?: { single?: boolean; header?: boolean }) {
    if (!this.supported) return
    this.single = !!opts?.single
    this.speakHeader = opts?.header !== false && !this.single
    const book = await loadBook(pos.book)
    this.chapter = book
    this.position = { ...pos }
    this.softPaused = false
    this.status = 'playing'
    this.requestWake()
    this.speakCurrent()
  }

  pause() {
    if (!this.supported || this.status !== 'playing') return
    const synth = window.speechSynthesis
    synth.pause()
    this.status = 'paused'
    this.emit()
    // Android Chrome ignores pause() — detect and emulate it instead.
    window.setTimeout(() => {
      if (this.status === 'paused' && synth.speaking && !synth.paused) {
        this.cancelToken++
        synth.cancel()
        this.softPaused = true
      }
    }, 300)
  }

  resume() {
    if (!this.supported || this.status !== 'paused') return
    if (this.softPaused) {
      this.softPaused = false
      this.status = 'playing'
      this.speakCurrent()
    } else {
      window.speechSynthesis.resume()
      this.status = 'playing'
    }
    this.requestWake()
    this.emit()
  }

  stop() {
    if (!this.supported) return
    this.cancelToken++
    window.speechSynthesis.cancel()
    this.releaseWake()
    this.status = 'idle'
    this.position = null
    this.softPaused = false
    this.emit()
  }

  /** Jump within the loaded chapter (or across chapters when listening). */
  jumpTo(verse: number) {
    if (!this.supported || !this.position) return
    this.cancelToken++
    window.speechSynthesis.cancel()
    this.position.verse = verse
    this.softPaused = false
    if (this.status === 'paused') this.status = 'playing'
    this.speakCurrent()
  }

  next() {
    if (!this.position) return
    const meta = bookMeta(this.position.book)
    const verses = this.chapter?.chapters[this.position.chapter - 1]?.verses.length ?? meta?.verseCounts[this.position.chapter - 1] ?? 0
    if (this.position.verse < verses) this.jumpTo(this.position.verse + 1)
    else this.advanceChapter(true)
  }

  prev() {
    if (!this.position) return
    if (this.position.verse > 1) this.jumpTo(this.position.verse - 1)
  }

  /* Settings --------------------------------------------------------------- */

  setRate(rate: number) {
    this.rate = rate
    if (this.status === 'playing' && this.position) this.speakCurrent()
  }

  setVoice(uri: string | null) {
    this.voiceURI = uri
    if (this.status === 'playing' && this.position) this.speakCurrent()
  }

  setAutoChapter(v: boolean) {
    this.autoChapter = v
  }

  /* Internals --------------------------------------------------------------- */

  private speechText(verse: number): string | null {
    if (!this.chapter) return null
    const ch = this.chapter.chapters[this.position!.chapter - 1]
    if (!ch) return null
    const raw = ch.verses[verse - 1]
    if (!raw) return null
    return raw.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  }

  private headerText(): string | null {
    if (!this.position || !this.chapter) return null
    const meta = bookMeta(this.position.book)
    if (!meta) return null
    return `${meta.name}, chapter ${this.position.chapter}.`
  }

  private speakCurrent() {
    if (!this.supported || !this.position) return
    const token = ++this.cancelToken
    const synth = window.speechSynthesis

    const speakVerseNow = () => {
      if (token !== this.cancelToken) return
      const text = this.speechText(this.position!.verse)
      if (!text || !text.trim()) {
        // Textual-note-only verse — skip forward.
        this.advance()
        return
      }
      const u = new SpeechSynthesisUtterance(text)
      u.rate = this.rate
      const voice = this.pickVoice()
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      }
      u.onend = () => {
        if (token === this.cancelToken && this.status === 'playing') this.advance()
      }
      u.onerror = (e) => {
        if (token !== this.cancelToken) return
        if (e.error === 'interrupted' || e.error === 'canceled') return
        // Unexpected failure — stop cleanly.
        this.status = 'idle'
        this.releaseWake()
        this.emit()
      }
      synth.cancel()
      synth.speak(u)
      this.emit()
    }

    if (this.speakHeader && this.position.verse === 1) {
      this.speakHeader = false
      const header = this.headerText()
      if (header) {
        const hu = new SpeechSynthesisUtterance(header)
        hu.rate = this.rate
        const voice = this.pickVoice()
        if (voice) {
          hu.voice = voice
          hu.lang = voice.lang
        }
        hu.onend = () => {
          if (token === this.cancelToken && this.status === 'playing') speakVerseNow()
        }
        hu.onerror = () => speakVerseNow()
        synth.cancel()
        synth.speak(hu)
        this.emit()
        return
      }
    }
    speakVerseNow()
  }

  private advance() {
    if (!this.position) return
    if (this.single) {
      this.status = 'ended'
      this.releaseWake()
      this.emit()
      return
    }
    const index = loadIndexSync()
    const meta = index?.books.find((b) => b.id === this.position!.book)
    const verses = meta?.verseCounts[this.position.chapter - 1] ?? 0
    if (this.position.verse < verses) {
      this.position.verse++
      this.speakCurrent()
      return
    }
    if (this.autoChapter && index) {
      const next = nextChapter(this.position.book, this.position.chapter, index)
      if (next) {
        this.advanceChapter(false)
        return
      }
    }
    this.status = 'ended'
    this.releaseWake()
    this.emit()
  }

  private advanceChapter(force: boolean) {
    const index = loadIndexSync()
    if (!this.position || !index) return
    const next = nextChapter(this.position.book, this.position.chapter, index)
    if (!next || (!this.autoChapter && !force)) {
      this.status = 'ended'
      this.releaseWake()
      this.emit()
      return
    }
    const token = ++this.cancelToken
    loadBook(next.book).then((book) => {
      if (token !== this.cancelToken) return
      this.chapter = book
      this.position = { book: next.book, chapter: next.chapter, verse: 1 }
      this.speakHeader = true
      if (this.status === 'playing') this.speakCurrent()
      else this.emit()
    })
  }

  /* Screen wake lock (keep the display on while listening) ----------------- */

  private async requestWake() {
    if (!('wakeLock' in navigator)) return
    try {
      if (document.visibilityState !== 'visible') return
      this.wakeLock?.release().catch(() => undefined)
      this.wakeLock = await navigator.wakeLock.request('screen')
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null
      })
    } catch {
      this.wakeLock = null
    }
  }

  private releaseWake() {
    this.wakeLock?.release().catch(() => undefined)
    this.wakeLock = null
  }

  /** Re-acquire the wake lock when returning to the page mid-playback. */
  onVisible() {
    if (this.status === 'playing') this.requestWake()
  }
}

let cachedIndex: import('@/types').BibleIndex | null = null
function loadIndexSync() {
  if (cachedIndex) return cachedIndex
  loadIndex().then((i) => {
    cachedIndex = i
  })
  return cachedIndex
}

export const speechPlayer = new SpeechPlayer()
