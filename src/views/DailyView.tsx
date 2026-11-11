import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Headphones, Share2, Sunrise, ChevronRight } from 'lucide-react'
import { loadBook, loadIndex } from '@/lib/bible'
import {
  dailyRef,
  dailyVerseForDate,
  dailyVerseForDateKey,
  dateKey,
} from '@/lib/daily'
import { useLibrary } from '@/state/library'
import { usePlayer } from '@/state/player'
import { useToast } from '@/state/toast'
import { shareText } from '@/lib/share'
import type { BibleIndex } from '@/types'
import { VerseText } from '@/components/VerseRow'
import { PageHeader, Spinner, Button } from '@/components/ui'

export default function DailyView() {
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [text, setText] = useState<string | null>(null)
  const daily = dailyVerseForDate()
  const player = usePlayer()
  const { hasBookmark, toggleBookmark } = useLibrary()
  const { toast } = useToast()

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => {
      if (!alive) return
      setIndex(idx)
      loadBook(daily.book).then((b) => {
        if (!alive) return
        const ch = b.chapters[daily.chapter - 1]
        setText(ch?.verses[daily.verse - 1] ?? '')
      })
    })
    return () => {
      alive = false
    }
  }, [daily.book, daily.chapter, daily.verse])

  const ref = { book: daily.book, chapter: daily.chapter, verse: daily.verse }
  const refLabel = dailyRef(daily, index)
  const bookmarked = hasBookmark(ref)

  const onShare = async () => {
    if (text === null) return
    const how = await shareText(`${text}\n— ${refLabel} (World English Bible)`, 'Daily Light')
    if (how === 'copied') toast('Verse copied to clipboard')
    if (how === 'failed') toast('Could not share on this device')
  }

  /* The previous six days, most recent first. */
  const pastDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (i + 1))
    return dateKey(d)
  })

  return (
    <div className="view daily-view">
      <PageHeader
        title="Daily Bible"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      />

      <div className="daily-hero card">
        <div className="daily-hero-head">
          <Sunrise size={16} aria-hidden />
          <span>Today&rsquo;s verse</span>
        </div>
        {text === null ? (
          <div className="loading-block">
            <Spinner />
          </div>
        ) : (
          <>
            <blockquote className="daily-hero-text">
              <VerseText text={text} />
            </blockquote>
            <p className="daily-hero-ref">{refLabel}</p>
            <p className="daily-hero-devotion">{daily.devotion}</p>
            <div className="daily-hero-actions">
              {player.supported && (
                <Button
                  onClick={() => player.start({ ...ref }, { single: true })}
                  disabled={text === ''}
                >
                  <Headphones size={16} />
                  Listen
                </Button>
              )}
              <Button
                variant="soft"
                onClick={() => {
                  toggleBookmark(ref, text)
                  toast(bookmarked ? 'Bookmark removed' : 'Verse bookmarked')
                }}
              >
                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {bookmarked ? 'Saved' : 'Save'}
              </Button>
              <Button variant="soft" onClick={onShare}>
                <Share2 size={16} />
                Share
              </Button>
            </div>
            <Link to={`/read/${daily.book}/${daily.chapter}?v=${daily.verse}`} className="daily-hero-read">
              Read in context <ChevronRight size={14} />
            </Link>
          </>
        )}
      </div>

      <section className="home-section">
        <div className="home-head-row">
          <h2>Earlier this week</h2>
        </div>
        <div className="daily-history">
          {pastDays.map((key) => (
            <PastDay key={key} dateKeyStr={key} index={index} />
          ))}
        </div>
      </section>

      <p className="daily-note">
        A new verse arrives every day at midnight, chosen from a curated devotional rotation.
      </p>
    </div>
  )
}

function PastDay({
  dateKeyStr,
  index,
}: {
  dateKeyStr: string
  index: BibleIndex | null
}) {
  const [text, setText] = useState<string | null>(null)
  const v = dailyVerseForDateKey(dateKeyStr)
  useEffect(() => {
    if (!v) return
    let alive = true
    loadBook(v.book).then((b) => {
      if (!alive) return
      const ch = b.chapters[v.chapter - 1]
      setText(ch?.verses[v.verse - 1] ?? '')
    })
    return () => {
      alive = false
    }
  }, [v])
  if (!v) return null
  const d = new Date(dateKeyStr + 'T00:00:00')
  return (
    <Link to={`/read/${v.book}/${v.chapter}?v=${v.verse}`} className="daily-history-card" aria-label={dailyRef(v, index)}>
      <span className="daily-history-date">
        {d.toLocaleDateString(undefined, { weekday: 'short' })}
      </span>
      <span className="daily-history-text">
        {(text ?? '…').replace(/\n/g, ' ').slice(0, 110)}
        {(text ?? '').length > 110 ? '…' : ''}
      </span>
      <span className="daily-history-ref">{dailyRef(v, index)}</span>
    </Link>
  )
}
