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

/** A narration problem worth showing to the user (never fail silently). */
export interface SpeechIssue {
  code: string
  message: string
}

/** Human wording for the error codes the Web Speech API reports. */
const SPEECH_ERRORS: Record<string, string> = {
  'not-allowed':
    'Your browser blocked audio playback. Tap play once more, and check that sound is allowed for this site.',
  'synthesis-failed': 'No speech voice is installed on this device.',
  'synthesis-unavailable': 'No speech engine is available on this device.',
  'audio-busy': 'Another app was using the audio output.',
  'audio-hardware': 'The audio output could not be opened.',
  'language-unavailable': 'That voice does not support this language.',
  'voice-unavailable': 'That voice is not installed on this device.',
  network: 'That voice needs a network connection and could not be reached.',
  'speak-failed': 'This browser refused to play the narration.',
  'no-audio':
    'Narration started but no sound came out. Turn up your media volume, then tap play again.',
  'load-failed': 'The passage could not be downloaded. Check your connection and try again.',
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
  /** The last narration problem, so failures are visible instead of silent. */
  issue: SpeechIssue | null = null

  /** Play a single verse (used by the Daily verse listen button). */
  private single = false
  /** True when a soft pause was emulated via cancel(). */
  private softPaused = false
  private chapter: BookData | null = null
  private cancelToken = 0
  private speakHeader = false
  private wakeLock: WakeLockSentinel | null = null
  private listeners = new Set<Listener>()
  /** True once the speech engine has been primed inside a user gesture. */
  private unlocked = false
  /** True once the iOS audio session has been switched to playback. */
  private sessionUnlocked = false
  /** Timestamp of the last cancel() — WebKit drops an utterance spoken too soon after. */
  private canceledAt = 0
  private watchdog: number | null = null

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

  /**
   * Chooses the voice to speak with:
   *   1. the one the user picked,
   *   2. a voice for the device's own language,
   *   3. any English voice,
   *   4. anything the engine offers.
   * Forcing a locale the device does not have makes iOS fail outright, so we
   * never hard-code a language here.
   */
  private pickVoice(): SpeechSynthesisVoice | null {
    const all = window.speechSynthesis.getVoices()
    if (this.voiceURI) {
      const chosen = all.find((x) => x.voiceURI === this.voiceURI)
      if (chosen) return chosen
    }
    if (!all.length) return null

    const device = (navigator.language || '').toLowerCase()
    const exact = all.find((v) => v.lang.toLowerCase() === device)
    if (exact) return exact

    const sameBase = all.find((v) => v.lang.toLowerCase().split('-')[0] === device.split('-')[0])
    if (sameBase) return sameBase

    const english = all.find((v) => v.lang.toLowerCase().startsWith('en'))
    if (english) return english

    return all[0] ?? null
  }

  /* Transport -------------------------------------------------------------- */

  /**
   * iOS/WebKit quirk: the speech engine ignores speak() calls that happen
   * outside a user gesture, and some mobile browsers stay silent until the
   * engine has been primed. Speaking a silent utterance during the first
   * touch makes every later narration work.
   */
  unlock() {
    // Always try to switch the audio session — it is cheap and the first
    // attempt can be refused before the page has a user gesture.
    this.unlockAudioSession()
    if (this.unlocked || !this.supported) return
    this.unlocked = true
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      u.rate = 2
      u.onerror = () => undefined
      window.speechSynthesis.speak(u)
    } catch {
      /* ignore — some engines refuse an empty utterance */
    }
  }

  /**
   * iOS quirk: a home-screen PWA plays speech through the ambient audio
   * category, so the phone's Silent switch mutes narration completely.
   * Playing a silent clip inside the tap switches iOS to the playback
   * category, after which the voice is audible even in Silent mode.
   */
  private unlockAudioSession() {
    if (this.sessionUnlocked) return
    try {
      const audio = new Audio(`${import.meta.env.BASE_URL}silence.wav`)
      audio.preload = 'auto'
      // `playsInline` keeps iOS from taking over the whole screen.
      audio.setAttribute('playsinline', 'true')
      const played = audio.play()
      if (played && typeof played.then === 'function') {
        played
          .then(() => {
            this.sessionUnlocked = true
            window.setTimeout(() => {
              audio.pause()
              try {
                audio.currentTime = 0
              } catch {
                /* ignore */
              }
            }, 120)
          })
          .catch(() => undefined) // refused — try again on the next tap
      } else {
        this.sessionUnlocked = true
      }
    } catch {
      /* ignore — not every browser allows this */
    }
  }

  /** Clears a reported problem (called when the user starts again). */
  clearIssue() {
    if (!this.issue) return
    this.issue = null
    this.emit()
  }

  /** Builds an utterance configured for the current settings. */
  private makeUtterance(text: string): SpeechSynthesisUtterance {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = this.rate
    const voice = this.pickVoice()
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    // When no voice is available we leave lang/voice untouched: forcing a
    // locale the device does not have makes some engines fail silently.
    return u
  }

  /**
   * Speaks an utterance in a way that survives mobile quirks:
   *  - resumes the engine if it was left paused,
   *  - waits a moment after a cancel (WebKit drops utterances spoken in the
   *    same tick as cancel()),
   *  - reports failures instead of failing silently.
   */
  private speakUtterance(
    u: SpeechSynthesisUtterance,
    onEnd: () => void,
    onFail: (code: string) => void,
    onStart?: () => void,
  ) {
    const synth = window.speechSynthesis
    const token = ++this.cancelToken

    const go = () => {
      if (token !== this.cancelToken) return
      if (synth.paused) {
        try {
          synth.resume()
        } catch {
          /* ignore */
        }
      }
      try {
        synth.speak(u)
      } catch {
        onFail('speak-failed')
      }
    }

    u.onstart = () => {
      this.clearWatchdog()
      onStart?.()
    }
    u.onend = () => {
      if (token === this.cancelToken) onEnd()
    }
    u.onerror = (e) => {
      const code = (e as SpeechSynthesisErrorEvent).error || 'unknown'
      if (code === 'interrupted' || code === 'canceled') return
      if (token !== this.cancelToken) return
      onFail(code)
    }

    const sinceCancel = Date.now() - this.canceledAt
    if (sinceCancel < 140) {
      window.setTimeout(go, 140 - sinceCancel)
    } else {
      go()
    }
  }

  /**
   * Speaks a short sample so Settings can confirm the device actually has a
   * working voice. Returns false when the browser has no speech engine.
   */
  test(): boolean {
    if (!this.supported) return false
    this.unlock()
    this.clearIssue()
    const u = this.makeUtterance('Testing one, two, three. This is Daily Light.')
    this.speakUtterance(
      u,
      () => this.emit(),
      (code) => this.fail(code),
      () => this.emit(),
    )
    this.startWatchdog()
    this.emit()
    return true
  }

  /** Fails the narration with a message the user can act on. */
  private fail(code: string) {
    this.clearWatchdog()
    this.status = 'idle'
    this.releaseWake()
    this.issue = {
      code,
      message: SPEECH_ERRORS[code] ?? 'Narration stopped unexpectedly. Tap play to try again.',
    }
    this.emit()
  }

  /** Warns if narration "started" but never produced any sound. */
  private startWatchdog() {
    this.clearWatchdog()
    this.watchdog = window.setTimeout(() => {
      const synth = window.speechSynthesis
      if (this.status === 'playing' && !synth.speaking && !synth.pending) {
        this.issue = { code: 'no-audio', message: SPEECH_ERRORS['no-audio'] }
        this.emit()
      }
    }, 3000)
  }

  private clearWatchdog() {
    if (this.watchdog !== null) {
      window.clearTimeout(this.watchdog)
      this.watchdog = null
    }
  }

  /** Start reading at a position. opts.single stops after that one verse. */
  start(pos: PlayerPosition, opts?: { single?: boolean; header?: boolean }) {
    if (!this.supported) return
    // Prime the engine inside the tap that started this.
    this.unlock()
    this.clearIssue()
    this.single = !!opts?.single
    this.speakHeader = opts?.header !== false && !this.single
    this.softPaused = false
    this.position = { ...pos }
    this.status = 'playing'
    this.requestWake()
    this.emit()

    // If the chapter is already in memory, speak immediately — mobile browsers
    // only accept speech that starts inside the user's tap.
    if (this.chapter && this.chapter.id === pos.book) {
      this.speakCurrent()
      return
    }

    loadBook(pos.book)
      .then((book) => {
        if (this.status !== 'playing' || !this.position) return
        this.chapter = book
        this.speakCurrent()
      })
      .catch(() => this.fail('load-failed'))
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
        this.canceledAt = Date.now()
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
    this.canceledAt = Date.now()
    this.clearWatchdog()
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
    this.canceledAt = Date.now()
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

    const speakVerseNow = () => {
      const pos = this.position
      if (!pos) return
      const text = this.speechText(pos.verse)
      if (!text || !text.trim()) {
        // Textual-note-only verse — skip forward.
        this.advance()
        return
      }
      const u = this.makeUtterance(text)
      this.speakUtterance(
        u,
        () => {
          if (this.status === 'playing') this.advance()
        },
        (code) => this.fail(code),
      )
      this.startWatchdog()
      this.emit()
    }

    if (this.speakHeader && this.position.verse === 1) {
      this.speakHeader = false
      const header = this.headerText()
      if (header) {
        const hu = this.makeUtterance(header)
        this.speakUtterance(
          hu,
          () => speakVerseNow(),
          () => speakVerseNow(),
        )
        this.startWatchdog()
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
    if (this.status !== 'playing') return
    // Mobile browsers often leave the engine paused after the app was in the
    // background — nudge it awake so the reading continues.
    const synth = window.speechSynthesis
    if (synth.paused) {
      try {
        synth.resume()
      } catch {
        /* ignore */
      }
    }
    this.requestWake()
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
