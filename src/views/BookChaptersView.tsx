import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadIndex } from '@/lib/bible'
import { useLibrary } from '@/state/library'
import type { BibleIndex } from '@/types'
import { PageHeader, ProgressRing, Spinner } from '@/components/ui'

export default function BookChaptersView() {
  const { id } = useParams()
  const bookId = Number(id)
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const { bookProgress, isChapterRead } = useLibrary()

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    return () => {
      alive = false
    }
  }, [])

  const meta = index?.books.find((b) => b.id === bookId)

  if (!index || !meta) {
    return (
      <div className="view">
        <PageHeader title="Bible" back={{ to: '/bible', label: 'Back to books' }} />
        <div className="loading-block">
          <Spinner />
        </div>
      </div>
    )
  }

  const read = bookProgress(meta.id, meta.chapters)
  const pct = Math.round((read / meta.chapters) * 100)
  const firstUnread = Array.from({ length: meta.chapters }, (_, i) => i + 1).find((c) => !isChapterRead(meta.id, c))

  return (
    <div className="view book-detail">
      <PageHeader
        title={meta.name}
        subtitle={`${meta.chapters} chapters · ${meta.verses.toLocaleString()} verses`}
        back={{ to: '/bible', label: 'All books' }}
      />

      <div className="book-hero">
        <ProgressRing progress={pct} size={72} stroke={7}>
          <strong>{pct}%</strong>
        </ProgressRing>
        <div className="book-hero-copy">
          <strong>
            {read === 0
              ? 'Not started yet'
              : read === meta.chapters
                ? 'Finished — well done'
                : `${read} of ${meta.chapters} chapters read`}
          </strong>
          {firstUnread ? (
            <Link to={`/read/${meta.id}/${firstUnread}`} className="book-hero-link">
              Continue at chapter {firstUnread} →
            </Link>
          ) : (
            <Link to={`/read/${meta.id}/1`} className="book-hero-link">
              Read chapter 1 again →
            </Link>
          )}
        </div>
      </div>

      <div className="chapter-grid">
        {Array.from({ length: meta.chapters }, (_, i) => i + 1).map((c) => (
          <Link
            key={c}
            to={`/read/${meta.id}/${c}`}
            className={`chapter-cell ${isChapterRead(meta.id, c) ? 'read' : ''}`}
          >
            {c}
          </Link>
        ))}
      </div>
    </div>
  )
}
