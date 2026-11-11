import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Check,
  ListChecks,
  BookOpen,
} from 'lucide-react'
import { loadBook, loadIndex, nextChapter, prevChapter } from '@/lib/bible'
import { planDaysFor } from '@/lib/plans'
import { useLibrary } from '@/state/library'
import { usePlayer } from '@/state/player'
import { usePlans } from '@/state/plans'
import { useSettings } from '@/state/settings'
import { useToast } from '@/state/toast'
import type { BibleIndex, BookData, VerseRef } from '@/types'
import { VerseRow } from '@/components/VerseRow'
import { VerseActionSheet } from '@/components/VerseActionSheet'
import { PageHeader, Spinner, Button } from '@/components/ui'

function scrollKey(book: number, chapter: number) {
  return `dl.scroll.${book}.${chapter}`
}

export default function ReaderView() {
  const { book: bookParam, chapter: chapterParam } = useParams()
  const bookId = Number(bookParam)
  const chapterNum = Number(chapterParam)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetVerse = Number(searchParams.get('v')) || null
  const planId = searchParams.get('plan')
  const planDay = searchParams.get('day') !== null ? Number(searchParams.get('day')) : null

  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [data, setData] = useState<BookData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [sheet, setSheet] = useState<{ ref: VerseRef; text: string } | null>(null)

  const { settings } = useSettings()
  const { recordVisit, markChapterRead, isChapterRead, highlightFor, hasBookmark, noteFor } = useLibrary()
  const player = usePlayer()
  const { plans, markDayComplete, uncompleteDay } = usePlans()
  const { toast } = useToast()

  /* Load index + book ------------------------------------------------------ */
  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => {
      if (!alive) return
      setIndex(idx)
      const meta = idx.books.find((b) => b.id === bookId)
      if (!meta || !Number.isFinite(chapterNum) || chapterNum < 1 || chapterNum > meta.chapters) {
        setNotFound(true)
        return
      }
      loadBook(bookId).then((d) => alive && setData(d))
    })
    return () => {
      alive = false
    }
  }, [bookId, chapterNum])

  /* Track the visit + restore scroll ---------------------------------------- */
  useEffect(() => {
    if (!data) return
    recordVisit(bookId, chapterNum)
    // Restore last scroll position (unless we are jumping to a verse).
    if (targetVerse) {
      const el = document.getElementById(`v-${targetVerse}`)
      if (el) {
        el.scrollIntoView({ block: 'center' })
        el.classList.add('flash-once')
        window.setTimeout(() => el.classList.remove('flash-once'), 2400)
      }
    } else {
      const saved = sessionStorage.getItem(scrollKey(bookId, chapterNum))
      if (saved) {
        const y = Number(saved)
        if (Number.isFinite(y) && y > 0) window.scrollTo({ top: y })
      } else {
        window.scrollTo({ top: 0 })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, bookId, chapterNum, targetVerse, recordVisit])

  /* Save scroll position ---------------------------------------------------- */
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        try {
          sessionStorage.setItem(scrollKey(bookId, chapterNum), String(window.scrollY))
        } catch {
          /* ignore */
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [bookId, chapterNum])

  const meta = index?.books.find((b) => b.id === bookId)
  const chapterData = data?.chapters[chapterNum - 1] ?? null

  /* Mark chapter read when the end comes into view --------------------------- */
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = endRef.current
    if (!el || !data) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) markChapterRead(bookId, chapterNum)
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [data, bookId, chapterNum, markChapterRead])

  /* Plan banner data --------------------------------------------------------- */
  const plan = planId ? plans.find((p) => p.id === planId) ?? null : null
  const planDays = useMemo(() => (plan && index ? planDaysFor(index, plan) : []), [plan, index])
  const dayIdx = planDay !== null && planDay >= 0 && planDay < planDays.length ? planDay : null
  const dayDone = plan && dayIdx !== null ? plan.completedDays.includes(dayIdx) : false

  /* Player integration -------------------------------------------------------- */
  const playingHere =
    player.position !== null && player.position.book === bookId && player.position.chapter === chapterNum
  const activeVerse = playingHere ? player.position?.verse ?? null : null

  useEffect(() => {
    if (!playingHere || !settings.followText || activeVerse === null) return
    const el = document.getElementById(`v-${activeVerse}`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeVerse, playingHere, settings.followText])

  const onPlay = useCallback(() => {
    if (playingHere && player.status === 'playing') {
      player.pause()
    } else {
      player.start({ book: bookId, chapter: chapterNum, verse: activeVerse ?? targetVerse ?? 1 })
    }
  }, [player, playingHere, activeVerse, targetVerse, bookId, chapterNum])

  /* Render --------------------------------------------------------------------- */

  if (notFound) {
    return (
      <div className="view">
        <PageHeader title="Passage not found" back={{ to: '/bible', label: 'Back to the Bible' }} />
        <p className="muted-note">That chapter does not exist in this translation.</p>
      </div>
    )
  }

  if (!index || !data || !chapterData || !meta) {
    return (
      <div className="view">
        <PageHeader title="Loading…" back={{ to: '/bible', label: 'Back to the Bible' }} />
        <div className="loading-block">
          <Spinner />
        </div>
      </div>
    )
  }

  const next = nextChapter(bookId, chapterNum, index)
  const prev = prevChapter(bookId, chapterNum, index)
  const read = isChapterRead(bookId, chapterNum)
  const verseCount = chapterData.verses.length

  return (
    <div className="view reader-view">
      <header className="reader-head">
        <Link to={`/bible/${bookId}`} className="reader-back" aria-label={`Back to ${meta.name}`}>
          <ChevronLeft size={20} />
        </Link>
        <div className="reader-title">
          <h1>{meta.name}</h1>
          <span>Chapter {chapterNum}</span>
        </div>
        <div className="reader-actions">
          {player.supported && (
            <button
              className="reader-play"
              onClick={onPlay}
              aria-label={playingHere && player.status === 'playing' ? 'Pause narration' : 'Listen to this chapter'}
            >
              {playingHere && player.status === 'playing' ? <Pause size={17} /> : <Play size={17} />}
              <span>{playingHere && player.status === 'playing' ? 'Pause' : 'Listen'}</span>
            </button>
          )}
        </div>
      </header>

      {plan && dayIdx !== null && (
        <div className="plan-banner">
          <div className="plan-banner-top">
            <ListChecks size={15} aria-hidden />
            <strong>
              {plan.name} · Day {dayIdx + 1} of {planDays.length}
            </strong>
            <Link to={`/plans/${plan.id}`} className="plan-banner-link">
              All days
            </Link>
          </div>
          <div className="plan-banner-passages">
            {planDays[dayIdx].passages.map((p) => {
              const isCurrent = p.book === bookId && p.chapter === chapterNum
              return (
                <Link
                  key={`${p.book}:${p.chapter}`}
                  to={`/read/${p.book}/${p.chapter}?plan=${plan.id}&day=${dayIdx}`}
                  className={`plan-chip ${isCurrent ? 'current' : ''}`}
                >
                  {index.books.find((b) => b.id === p.book)?.abbr ?? ''} {p.chapter}
                </Link>
              )
            })}
          </div>
          <Button
            variant={dayDone ? 'soft' : 'primary'}
            onClick={() => {
              if (dayDone) {
                uncompleteDay(plan.id, dayIdx)
              } else {
                markDayComplete(plan.id, dayIdx)
                const isLast = dayIdx + 1 >= planDays.length
                toast(
                  isLast ? 'Plan complete — well done!' : `Day ${dayIdx + 1} complete`,
                  !isLast && dayIdx + 1 < planDays.length
                    ? {
                        label: 'Next day',
                        onClick: () => {
                          const nextDay = planDays[dayIdx + 1]
                          const p = nextDay.passages[0]
                          navigate(`/read/${p.book}/${p.chapter}?plan=${plan.id}&day=${dayIdx + 1}`)
                        },
                      }
                    : undefined,
                )
              }
            }}
          >
            {dayDone ? (
              <>
                <Check size={16} /> Day complete — undo
              </>
            ) : (
              <>
                <Check size={16} /> Mark day {dayIdx + 1} complete
              </>
            )}
          </Button>
        </div>
      )}

      <div
        className="scripture"
        data-font={settings.scriptureFont}
        style={{
          fontSize: `calc(var(--verse-size) * ${settings.fontScale})`,
          lineHeight: String(settings.lineHeight),
        }}
      >
        {chapterData.title && <p className="chapter-superscription">{chapterData.title}</p>}
        {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => {
          const ref: VerseRef = { book: bookId, chapter: chapterNum, verse: v }
          return (
            <VerseRow
              key={v}
              verse={v}
              chapter={chapterData}
              book={bookId}
              chapterNumber={chapterNum}
              active={activeVerse === v}
              target={targetVerse === v}
              bookmarked={hasBookmark(ref)}
              highlightColor={highlightFor(ref)}
              notePreview={noteFor(ref)?.note ?? null}
              onTap={(r) => {
                const text = chapterData.verses[v - 1] ?? ''
                setSheet({ ref: r, text: text.replace(/\n/g, ' ') })
              }}
            />
          )
        })}
      </div>

      <div ref={endRef} className="reader-end" aria-hidden />

      <div className="reader-foot">
        <div className="read-state">
          {read ? (
            <span className="read-badge">
              <Check size={13} /> Chapter read
            </span>
          ) : (
            <button className="read-badge mark" onClick={() => markChapterRead(bookId, chapterNum)}>
              <BookOpen size={13} /> Mark as read
            </button>
          )}
        </div>
        <div className="chapter-nav">
          {prev ? (
            <Link to={`/read/${prev.book}/${prev.chapter}`} className="chapter-nav-btn">
              <ChevronLeft size={16} />
              {index.books.find((b) => b.id === prev.book)?.abbr} {prev.chapter}
            </Link>
          ) : (
            <span className="chapter-nav-btn ghosted">Start of the Bible</span>
          )}
          {next ? (
            <Link to={`/read/${next.book}/${next.chapter}`} className="chapter-nav-btn next">
              {index.books.find((b) => b.id === next.book)?.abbr} {next.chapter}
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="chapter-nav-btn ghosted">End of the Bible</span>
          )}
        </div>
      </div>

      <VerseActionSheet verse={sheet?.ref ?? null} text={sheet?.text ?? ''} onClose={() => setSheet(null)} />
    </div>
  )
}
