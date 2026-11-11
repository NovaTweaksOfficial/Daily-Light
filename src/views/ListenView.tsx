import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Headphones, Pause, Play, SkipBack, SkipForward, Square, BookOpen, Sunrise } from 'lucide-react'
import { loadBook, loadIndex, refString } from '@/lib/bible'
import { dailyVerseForDate, dailyRef } from '@/lib/daily'
import { usePlayer } from '@/state/player'
import { useSettings } from '@/state/settings'
import { useLibrary } from '@/state/library'
import type { BibleIndex, BookData } from '@/types'
import { VerseRow } from '@/components/VerseRow'
import { PageHeader, Segmented, Toggle } from '@/components/ui'

const RATES = [0.75, 1, 1.25, 1.5, 2].map((r) => ({ value: r, label: `${r}×` }))

export default function ListenView() {
  const player = usePlayer()
  const { settings, update } = useSettings()
  const { lastRead } = useLibrary()
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [book, setBook] = useState<BookData | null>(null)
  const [dailyText, setDailyText] = useState<string | null>(null)
  const followRef = useRef<HTMLDivElement>(null)

  const pos = player.position
  const active = player.status !== 'idle' ? pos : null

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    const daily = dailyVerseForDate()
    loadBook(daily.book).then((b) => {
      if (!alive) return
      const ch = b.chapters[daily.chapter - 1]
      setDailyText(ch?.verses[daily.verse - 1] ?? '')
    })
    return () => {
      alive = false
    }
  }, [])

  /* Load the book being narrated. */
  useEffect(() => {
    if (!pos) {
      setBook(null)
      return
    }
    let alive = true
    loadBook(pos.book).then((b) => alive && setBook(b))
    return () => {
      alive = false
    }
  }, [pos?.book])

  /* Follow the verse being read. */
  useEffect(() => {
    if (!active || !settings.followText) return
    const el = document.getElementById(`v-${active.verse}`)
    if (el) {
      const box = followRef.current
      if (!box) return
      const boxTop = box.getBoundingClientRect().top
      const elTop = el.getBoundingClientRect().top
      // Only auto-scroll when the verse drifts outside the follow panel.
      if (elTop < boxTop + 8 || elTop > boxTop + box.clientHeight - 80) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  }, [active?.verse, active, settings.followText])

  const chapterData = useMemo(() => {
    if (!active || !book) return null
    return book.chapters[active.chapter - 1] ?? null
  }, [active, book])

  if (!player.supported) {
    return (
      <div className="view listen-view">
        <PageHeader title="Listen" subtitle="Bible narration" />
        <div className="card unsupported-card">
          <Headphones size={22} aria-hidden />
          <h3>Narration is not available here</h3>
          <p>
            This browser does not include a speech engine. Narration works in Safari, Chrome, Edge,
            and most Android browsers — iOS requires Safari (or an app-shell browser that enables
            it). Reading, plans, and everything else still work perfectly.
          </p>
        </div>
      </div>
    )
  }

  /* Nothing playing yet — offer starting points. */
  if (!active || !chapterData) {
    const daily = dailyVerseForDate()
    return (
      <div className="view listen-view">
        <PageHeader title="Listen" subtitle="Bible narration with follow-along text" />
        <div className="listen-picks">
          <button
            className="listen-pick card"
            onClick={() => player.start({ book: daily.book, chapter: daily.chapter, verse: daily.verse }, { single: true })}
          >
            <Sunrise size={18} aria-hidden />
            <span className="listen-pick-copy">
              <strong>Today&rsquo;s verse</strong>
              <span>{dailyRef(daily, index)}</span>
            </span>
            <Play size={16} className="listen-pick-go" aria-hidden />
          </button>

          {lastRead ? (
            <button
              className="listen-pick card"
              onClick={() => player.start({ book: lastRead.book, chapter: lastRead.chapter, verse: 1 })}
            >
              <BookOpen size={18} aria-hidden />
              <span className="listen-pick-copy">
                <strong>Continue where you left off</strong>
                <span>{refString(lastRead.book, lastRead.chapter, undefined, index ?? undefined)}</span>
              </span>
              <Play size={16} className="listen-pick-go" aria-hidden />
            </button>
          ) : (
            <button className="listen-pick card" onClick={() => player.start({ book: 43, chapter: 1, verse: 1 })}>
              <BookOpen size={18} aria-hidden />
              <span className="listen-pick-copy">
                <strong>Start with John 1</strong>
                <span>“In the beginning was the Word…”</span>
              </span>
              <Play size={16} className="listen-pick-go" aria-hidden />
            </button>
          )}

          {dailyText !== null && (
            <Link to="/bible" className="listen-pick card">
              <Headphones size={18} aria-hidden />
              <span className="listen-pick-copy">
                <strong>Pick any passage</strong>
                <span>Open a chapter and tap “Listen”</span>
              </span>
            </Link>
          )}
        </div>

        <p className="listen-tip">
          Tip: tap any verse while reading to start narration from that point. Narration keeps
          going into the next chapter automatically.
        </p>
      </div>
    )
  }

  const label = refString(active.book, active.chapter, active.verse, index ?? undefined)

  return (
    <div className="view listen-view">
      <PageHeader title="Listen" subtitle={label} />

      {/* Transport */}
      <div className="transport card">
        <span className={`transport-status ${player.status}`}>{player.status}</span>
        <div className="transport-controls">
          <button className="transport-btn" aria-label="Previous verse" onClick={() => player.prev()}>
            <SkipBack size={20} />
          </button>
          {player.status === 'playing' ? (
            <button className="transport-btn main" aria-label="Pause" onClick={() => player.pause()}>
              <Pause size={26} />
            </button>
          ) : (
            <button
              className="transport-btn main"
              aria-label="Play"
              onClick={() => (player.status === 'paused' ? player.resume() : player.start(active))}
            >
              <Play size={26} />
            </button>
          )}
          <button className="transport-btn" aria-label="Next verse" onClick={() => player.next()}>
            <SkipForward size={20} />
          </button>
          <button className="transport-btn stop" aria-label="Stop" onClick={() => player.stop()}>
            <Square size={16} />
          </button>
        </div>
        <div className="transport-rate">
          <span className="transport-rate-label">Speed</span>
          <Segmented
            options={RATES}
            value={settings.ttsRate}
            onChange={(r) => update({ ttsRate: r })}
          />
        </div>
      </div>

      {/* Follow-along text */}
      <div className="listen-follow card" ref={followRef}>
        <div className="scripture" data-font={settings.scriptureFont} style={{ fontSize: `calc(var(--verse-size) * ${settings.fontScale})` }}>
          {chapterData.title && <p className="chapter-superscription">{chapterData.title}</p>}
          {Array.from({ length: chapterData.verses.length }, (_, i) => i + 1).map((v) => (
            <VerseRow
              key={v}
              verse={v}
              chapter={chapterData}
              book={active.book}
              chapterNumber={active.chapter}
              active={active.verse === v}
              onTap={() => player.jumpTo(v)}
            />
          ))}
        </div>
      </div>
      <p className="listen-tip">Tap a verse to jump narration there.</p>

      {/* Voice + behavior */}
      <div className="listen-settings card">
        <div className="settings-row">
          <div className="settings-copy">
            <strong>Continue into next chapter</strong>
            <span>When a chapter ends, keep reading the next one aloud.</span>
          </div>
          <Toggle
            checked={settings.autoAdvanceChapters}
            onChange={(v) => update({ autoAdvanceChapters: v })}
            label="Auto-advance chapters"
          />
        </div>
        <div className="settings-row">
          <div className="settings-copy">
            <strong>Highlight as it reads</strong>
            <span>Follow the verse being spoken.</span>
          </div>
          <Toggle
            checked={settings.followText}
            onChange={(v) => update({ followText: v })}
            label="Follow along"
          />
        </div>
        <div className="settings-row col">
          <div className="settings-copy">
            <strong>Voice</strong>
            <span>Uses your device&rsquo;s installed voices.</span>
          </div>
          <select
            className="voice-select"
            value={settings.ttsVoiceURI ?? ''}
            onChange={(e) => update({ ttsVoiceURI: e.target.value || null })}
            aria-label="Narration voice"
          >
            <option value="">Device default</option>
            {player.voices.map((v) => (
              <option key={v.uri} value={v.uri}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
