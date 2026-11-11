import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, BookOpen, Search, Bookmark, NotebookPen, ListChecks, ChevronRight, Clock3, Headphones } from 'lucide-react'
import { loadIndex, loadBook, refString } from '@/lib/bible'
import { dailyVerseForDate, dailyRef, dateKey } from '@/lib/daily'
import { useLibrary } from '@/state/library'
import { greeting, formatDayLabel } from '@/lib/share'
import type { BibleIndex } from '@/types'
import { VerseText } from '@/components/VerseRow'

export default function HomeView() {
  const nav = useNavigate()
  const { lastRead, streak, chaptersRead, history, bookmarks, notes, highlights } = useLibrary()
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [dailyText, setDailyText] = useState<string | null>(null)
  const daily = dailyVerseForDate()

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => {
      if (!alive) return
      setIndex(idx)
      loadBook(daily.book).then((b) => {
        if (!alive) return
        const ch = b.chapters[daily.chapter - 1]
        setDailyText(ch?.verses[daily.verse - 1] ?? null)
      })
    })
    return () => {
      alive = false
    }
  }, [daily.book, daily.chapter, daily.verse])

  const totalChapters = index ? index.books.reduce((a, b) => a + b.chapters, 0) : 1189
  const percentBible = Math.round((chaptersRead.size / totalChapters) * 100)
  const now = new Date()

  const quickTiles = [
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/saved', icon: Bookmark, label: 'Saved' },
    { to: '/plans', icon: ListChecks, label: 'Plans' },
    { to: '/listen', icon: Headphones, label: 'Listen' },
  ]

  return (
    <div className="view home-view">
      <header className="home-hero">
        <div className="home-hero-top">
          <div>
            <p className="home-date">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="home-greeting">{greeting()}.</h1>
          </div>
          <span className="brand-mark small" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="9.4" y="3.2" width="5.2" height="17.6" rx="1.6" fill="currentColor" />
              <rect x="4.5" y="8.1" width="15" height="5.2" rx="1.6" fill="currentColor" />
            </svg>
          </span>
        </div>
      </header>

      {/* Continue reading */}
      <section className="home-section">
        {lastRead ? (
          <Link to={`/read/${lastRead.book}/${lastRead.chapter}`} className="continue-card">
            <div className="continue-copy">
              <span className="continue-eyebrow">
                <BookOpen size={14} /> Continue reading
              </span>
              <strong className="continue-ref">{refString(lastRead.book, lastRead.chapter, undefined, index ?? undefined)}</strong>
              <span className="continue-cta">
                Resume <ChevronRight size={15} />
              </span>
            </div>
            <div className="continue-art" aria-hidden>
              {index ? (index.books.find((b) => b.id === lastRead.book)?.abbr ?? 'Bible') : '…'}
            </div>
          </Link>
        ) : (
          <Link to="/bible" className="continue-card">
            <div className="continue-copy">
              <span className="continue-eyebrow">
                <BookOpen size={14} /> Start reading
              </span>
              <strong className="continue-ref">The whole Bible awaits</strong>
              <span className="continue-cta">
                Browse all 66 books <ChevronRight size={15} />
              </span>
            </div>
            <div className="continue-art" aria-hidden>
              WEB
            </div>
          </Link>
        )}
      </section>

      {/* Daily verse */}
      <section className="home-section">
        <div className="home-head-row">
          <h2>Daily verse</h2>
          <Link to="/daily" className="home-head-link">
            Open <ChevronRight size={14} />
          </Link>
        </div>
        <button
          className="daily-card"
          onClick={() => nav('/daily')}
          aria-label="Open today's verse"
        >
          <p className="daily-card-text">
            {dailyText === null ? '…' : <VerseText text={dailyText ?? ''} />}
          </p>
          <div className="daily-card-foot">
            <span className="daily-card-ref">{dailyRef(daily, index)}</span>
            <span className="daily-card-go">Listen, reflect & share</span>
          </div>
        </button>
      </section>

      {/* Stats */}
      <section className="home-section">
        <div className="stat-row">
          <div className="stat-tile">
            <Flame size={17} className="stat-ico streak" aria-hidden />
            <div>
              <strong>{streak.current}</strong>
              <span>day{streak.current === 1 ? '' : 's'} streak</span>
            </div>
          </div>
          <div className="stat-tile">
            <BookOpen size={17} className="stat-ico" aria-hidden />
            <div>
              <strong>{chaptersRead.size}</strong>
              <span>chapters read</span>
            </div>
          </div>
          <div className="stat-tile">
            <Clock3 size={17} className="stat-ico" aria-hidden />
            <div>
              <strong>{percentBible}%</strong>
              <span>of the Bible</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="home-section">
        <div className="quick-grid">
          {quickTiles.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="quick-tile">
              <Icon size={20} strokeWidth={1.9} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Library summary + recently read */}
      <section className="home-section">
        <div className="home-head-row">
          <h2>Recently read</h2>
          <Link to="/saved" className="home-head-link">
            <Bookmark size={13} /> {bookmarks.length}
            <NotebookPen size={13} /> {notes.length}
            <span title="Highlights">✦ {highlights.length}</span>
          </Link>
        </div>
        {history.length ? (
          <div className="recent-row">
            {history.slice(0, 8).map((h) => (
              <Link key={h.id} to={`/read/${h.book}/${h.chapter}`} className="recent-chip">
                <strong>{refString(h.book, h.chapter, undefined, index ?? undefined)}</strong>
                <span>{formatDayLabel(dateKey(new Date(h.at)))}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="home-empty-line">Chapters you open will appear here.</p>
        )}
      </section>
    </div>
  )
}
