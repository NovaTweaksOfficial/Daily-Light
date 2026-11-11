import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { loadIndex, totalChapterCount } from '@/lib/bible'
import { useLibrary } from '@/state/library'
import type { BibleIndex, BookMeta } from '@/types'
import { PageHeader, Spinner } from '@/components/ui'

export default function BibleView() {
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [query, setQuery] = useState('')
  const { bookProgress } = useLibrary()

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    return () => {
      alive = false
    }
  }, [])

  const books = useMemo(() => {
    if (!index) return []
    const q = query.trim().toLowerCase()
    if (!q) return index.books
    return index.books.filter((b) => b.name.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q))
  }, [index, query])

  if (!index) {
    return (
      <div className="view">
        <PageHeader title="The Bible" subtitle="World English Bible · 66 books" />
        <div className="loading-block">
          <Spinner />
        </div>
      </div>
    )
  }

  const ot = books.filter((b) => b.testament === 'OT')
  const nt = books.filter((b) => b.testament === 'NT')

  return (
    <div className="view bible-view">
      <PageHeader
        title="The Bible"
        subtitle={`${totalChapterCount(index)} chapters · World English Bible`}
      />

      <div className="book-search">
        <Search size={16} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a book…"
          aria-label="Find a book"
        />
        {query && (
          <button className="book-search-clear" onClick={() => setQuery('')} aria-label="Clear">
            Clear
          </button>
        )}
      </div>

      {!books.length && <p className="muted-note">No books match “{query}”.</p>}

      {ot.length > 0 && (
        <section className="book-section">
          <h2 className="book-section-title">Old Testament</h2>
          <div className="book-grid">
            {ot.map((b) => (
              <BookTile key={b.id} book={b} read={bookProgress(b.id, b.chapters)} />
            ))}
          </div>
        </section>
      )}

      {nt.length > 0 && (
        <section className="book-section">
          <h2 className="book-section-title">New Testament</h2>
          <div className="book-grid">
            {nt.map((b) => (
              <BookTile key={b.id} book={b} read={bookProgress(b.id, b.chapters)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function BookTile({ book, read }: { book: BookMeta; read: number }) {
  const pct = Math.round((read / book.chapters) * 100)
  return (
    <Link to={`/bible/${book.id}`} className="book-tile" data-done={pct === 100 || undefined}>
      <span className="book-tile-name">{book.name}</span>
      <span className="book-tile-meta">
        {book.chapters} ch{read > 0 && ` · ${read} read`}
      </span>
      <span className="book-tile-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </span>
      <ChevronRight size={14} className="book-tile-chev" aria-hidden />
    </Link>
  )
}
