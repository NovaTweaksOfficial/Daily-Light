import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, CornerDownRight, Loader2 } from 'lucide-react'
import { loadAllBooks, loadIndex } from '@/lib/bible'
import { parseReference } from '@/lib/refs'
import type { BibleIndex, SearchHit } from '@/types'
import { PageHeader, EmptyState } from '@/components/ui'

const MAX_RESULTS = 400

export default function SearchView() {
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [query, setQuery] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 66 })
  const [results, setResults] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    inputRef.current?.focus()
    return () => {
      alive = false
    }
  }, [])

  /* Run the search (debounced) ------------------------------------------------ */
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) {
      setResults(null)
      setSearching(false)
      return
    }
    let cancel = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const all = await loadAllBooks((done, total) => {
          if (!cancel) setProgress({ done, total })
        })
        if (cancel) return
        const hits: SearchHit[] = []
        for (const book of all) {
          for (let c = 0; c < book.chapters.length; c++) {
            const ch = book.chapters[c]
            for (let v = 0; v < ch.verses.length; v++) {
              const text = ch.verses[v]
              if (!text) continue
              const plain = text.replace(/\n/g, ' ')
              if (plain.toLowerCase().includes(q)) {
                hits.push({ book: book.id, chapter: c + 1, verse: v + 1, text: plain })
                if (hits.length >= MAX_RESULTS) break
              }
            }
            if (hits.length >= MAX_RESULTS) break
          }
          if (hits.length >= MAX_RESULTS) break
        }
        if (!cancel) setResults(hits)
      } finally {
        if (!cancel) setSearching(false)
      }
    }, 300)
    return () => {
      cancel = true
      clearTimeout(timer)
    }
  }, [query])

  const parsed = useMemo(
    () => (index && query.trim().length >= 2 ? parseReference(query, index) : null),
    [query, index],
  )

  const grouped = useMemo(() => {
    if (!results || !index) return null
    const byBook = new Map<number, SearchHit[]>()
    for (const h of results) {
      const list = byBook.get(h.book) ?? []
      list.push(h)
      byBook.set(h.book, list)
    }
    return [...byBook.entries()]
  }, [results, index])

  const q = query.trim()

  return (
    <div className="view search-view">
      <PageHeader title="Search" subtitle="Keywords or a reference like “John 3:16”" />

      <div className="search-bar">
        <SearchIcon size={17} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Bible…"
          aria-label="Search the Bible"
          autoComplete="off"
        />
        {query && (
          <button className="book-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            Clear
          </button>
        )}
      </div>

      {/* Passage shortcut */}
      {parsed && index && (
        <Link to={`/read/${parsed.book}/${parsed.chapter}${parsed.verse ? `?v=${parsed.verse}` : ''}`} className="ref-chip card">
          <CornerDownRight size={15} aria-hidden />
          <span>
            Go to <strong>{index.books.find((b) => b.id === parsed.book)?.name} {parsed.chapter}{parsed.verse ? `:${parsed.verse}` : ''}</strong>
          </span>
        </Link>
      )}

      {/* Keyword results */}
      {q.length >= 2 && searching && !results && (
        <div className="search-progress">
          <Loader2 size={15} className="spin" aria-hidden />
          <span>Searching… {progress.done < progress.total ? `${progress.done}/${progress.total} books indexed` : 'matching verses'}</span>
        </div>
      )}

      {results && (
        <p className="results-count">
          {results.length === MAX_RESULTS
            ? `${MAX_RESULTS}+ verses found — refine your search to see more`
            : `${results.length} verse${results.length === 1 ? '' : 's'} found`}
        </p>
      )}

      {grouped &&
        grouped.map(([bookId, hits]) => {
          const meta = index?.books.find((b) => b.id === bookId)
          return (
            <section key={bookId} className="results-book">
              <h3 className="results-book-title">
                {meta?.name ?? `Book ${bookId}`}
                <span>{hits.length}</span>
              </h3>
              <div className="results-list">
                {hits.map((h) => (
                  <Link
                    key={`${h.book}:${h.chapter}:${h.verse}`}
                    to={`/read/${h.book}/${h.chapter}?v=${h.verse}`}
                    className="result-row"
                  >
                    <span className="result-ref">
                      {meta?.abbr} {h.chapter}:{h.verse}
                    </span>
                    <span className="result-text">{snippet(h.text, q)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

      {q.length >= 2 && !searching && results && results.length === 0 && !parsed && (
        <EmptyState
          icon={<SearchIcon size={22} />}
          title={`No verses contain “${q}”`}
          text="Try a different word or phrase — the whole Bible is searched offline."
        />
      )}

      {q.length < 2 && (
        <div className="search-suggest card">
          <h3>Try searching for…</h3>
          <div className="suggest-row">
            {['love', 'John 3:16', 'shepherd', 'Psalm 23', 'light', 'Gen 1:1', 'grace', 'Romans 8'].map((s) => (
              <button key={s} className="suggest-chip" onClick={() => setQuery(s)}>
                {s}
              </button>
            ))}
          </div>
          <p className="suggest-note">
            Tip: type a reference like <strong>John 3:16</strong> to jump straight to a passage.
          </p>
        </div>
      )}
    </div>
  )
}

function snippet(text: string, q: string): React.ReactNode {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text.length > 140 ? text.slice(0, 140) + '…' : text
  const start = Math.max(0, i - 45)
  const end = Math.min(text.length, i + q.length + 80)
  const before = (start > 0 ? '…' : '') + text.slice(start, i)
  const match = text.slice(i, i + q.length)
  const after = text.slice(i + q.length, end) + (end < text.length ? '…' : '')
  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  )
}
