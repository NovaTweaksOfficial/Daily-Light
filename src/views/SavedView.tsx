import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark as BookmarkIcon, Highlighter, NotebookPen, Trash2, Search } from 'lucide-react'
import { loadIndex, refString } from '@/lib/bible'
import { useLibrary } from '@/state/library'
import { useToast } from '@/state/toast'
import type { BibleIndex, Bookmark, Highlight, Note } from '@/types'
import { PageHeader, EmptyState, Segmented } from '@/components/ui'
import { formatDate } from '@/lib/share'

type Tab = 'bookmarks' | 'highlights' | 'notes'

export default function SavedView() {
  const [tab, setTab] = useState<Tab>('bookmarks')
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const { bookmarks, highlights, notes, toggleBookmark, setHighlight, deleteNote } = useLibrary()
  const { toast } = useToast()

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    return () => {
      alive = false
    }
  }, [])

  const total = bookmarks.length + highlights.length + notes.length
  const refOf = (v: Bookmark | Highlight | Note) =>
    refString(v.book, v.chapter, v.verse, index ?? undefined)

  return (
    <div className="view saved-view">
      <PageHeader title="Saved" subtitle="Bookmarks, highlights, and notes" />

      <Segmented
        className="saved-tabs"
        options={[
          { value: 'bookmarks' as Tab, label: `Bookmarks ${bookmarks.length}` },
          { value: 'highlights' as Tab, label: `Highlights ${highlights.length}` },
          { value: 'notes' as Tab, label: `Notes ${notes.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {total === 0 && (
        <EmptyState
          icon={<BookmarkIcon size={22} />}
          title="Nothing saved yet"
          text="Tap any verse while reading to bookmark it, highlight it, or write a note."
        />
      )}

      {tab === 'bookmarks' && bookmarks.length > 0 && (
        <div className="saved-list">
          {bookmarks.map((b) => (
            <SavedRow
              key={b.id}
              to={`/read/${b.book}/${b.chapter}?v=${b.verse}`}
              title={refOf(b)}
              text={b.text}
              meta={`Saved ${formatDate(b.createdAt)}`}
              icon={<BookmarkIcon size={14} />}
              onDelete={() => {
                toggleBookmark(b, b.text)
                toast('Bookmark removed')
              }}
              deleteLabel="Remove bookmark"
            />
          ))}
        </div>
      )}

      {tab === 'highlights' && highlights.length > 0 && (
        <div className="saved-list">
          {highlights.map((h) => (
            <SavedRow
              key={h.id}
              to={`/read/${h.book}/${h.chapter}?v=${h.verse}`}
              title={refOf(h)}
              text={`Highlighted in ${h.color}`}
              meta={`Added ${formatDate(h.createdAt)}`}
              icon={<Highlighter size={14} />}
              color={h.color}
              onDelete={() => {
                setHighlight(h, null)
                toast('Highlight removed')
              }}
              deleteLabel="Remove highlight"
            />
          ))}
        </div>
      )}

      {tab === 'notes' && notes.length > 0 && (
        <div className="saved-list">
          {notes.map((n) => (
            <SavedRow
              key={n.id}
              to={`/read/${n.book}/${n.chapter}?v=${n.verse}`}
              title={refOf(n)}
              text={n.note}
              quote={n.text}
              meta={`Updated ${formatDate(n.updatedAt)}`}
              icon={<NotebookPen size={14} />}
              onDelete={() => {
                deleteNote(n)
                toast('Note deleted')
              }}
              deleteLabel="Delete note"
            />
          ))}
        </div>
      )}

      {((tab === 'bookmarks' && bookmarks.length === 0) ||
        (tab === 'highlights' && highlights.length === 0) ||
        (tab === 'notes' && notes.length === 0)) &&
        total > 0 && (
          <EmptyState
            icon={<Search size={22} />}
            title={`No ${tab} yet`}
            text={
              tab === 'bookmarks'
                ? 'Tap a verse and choose Bookmark to save it here.'
                : tab === 'highlights'
                  ? 'Tap a verse and pick a highlight color to save it here.'
                  : 'Tap a verse and write a note to keep it here.'
            }
          />
        )}
    </div>
  )
}

function SavedRow({
  to,
  title,
  text,
  quote,
  meta,
  icon,
  color,
  onDelete,
  deleteLabel,
}: {
  to: string
  title: string
  text: string
  quote?: string
  meta: string
  icon: React.ReactNode
  color?: string
  onDelete: () => void
  deleteLabel: string
}) {
  return (
    <div className={`saved-row ${color ? `hl-${color}` : ''}`}>
      <Link to={to} className="saved-row-main">
        <span className="saved-row-head">
          <span className="saved-row-icon">{icon}</span>
          <strong>{title}</strong>
        </span>
        <span className="saved-row-text">{text.length > 160 ? text.slice(0, 160) + '…' : text}</span>
        {quote && <span className="saved-row-quote">“{quote.length > 90 ? quote.slice(0, 90) + '…' : quote}”</span>}
        <span className="saved-row-meta">{meta}</span>
      </Link>
      <button className="saved-row-delete" onClick={onDelete} aria-label={deleteLabel} title={deleteLabel}>
        <Trash2 size={15} />
      </button>
    </div>
  )
}
