import { useEffect, useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  Highlighter,
  NotebookPen,
  Play,
  Share2,
  Trash2,
  ClipboardCopy,
} from 'lucide-react'
import type { HighlightColor, VerseRef } from '@/types'
import { Sheet, Button } from '@/components/ui'
import { useLibrary } from '@/state/library'
import { useToast } from '@/state/toast'
import { usePlayer } from '@/state/player'
import { shareText } from '@/lib/share'
import { refString } from '@/lib/bible'

export const HIGHLIGHT_COLORS: { id: HighlightColor; label: string; swatch: string }[] = [
  { id: 'yellow', label: 'Sunlight', swatch: '#f3d47a' },
  { id: 'green', label: 'Meadow', swatch: '#9ed6a2' },
  { id: 'blue', label: 'Stream', swatch: '#a8cdea' },
  { id: 'pink', label: 'Blossom', swatch: '#f0b9cd' },
  { id: 'purple', label: 'Twilight', swatch: '#c9b6e8' },
]

export function VerseActionSheet({
  verse,
  text,
  onClose,
}: {
  verse: VerseRef | null
  text: string
  onClose: () => void
}) {
  const { hasBookmark, toggleBookmark, highlightFor, setHighlight, noteFor, saveNote } = useLibrary()
  const { toast } = useToast()
  const player = usePlayer()
  const [noteDraft, setNoteDraft] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)

  useEffect(() => {
    if (verse) {
      setNoteDraft(noteFor(verse)?.note ?? '')
      setNoteOpen(!!noteFor(verse))
    }
  }, [verse, noteFor])

  if (!verse) return null
  const ref = refString(verse.book, verse.chapter, verse.verse)
  const bookmarked = hasBookmark(verse)
  const hl = highlightFor(verse)

  const doShare = async () => {
    const how = await shareText(`${text}\n— ${ref} (World English Bible)`, ref)
    if (how === 'copied') toast('Verse copied to clipboard')
    if (how === 'failed') toast('Could not share on this device')
  }

  return (
    <Sheet open={!!verse} onClose={onClose} title={ref}>
      <p className="sheet-verse">
        “{text.length > 400 ? text.slice(0, 400) + '…' : text}”
      </p>

      <div className="verse-actions">
        <Button
          variant="soft"
          onClick={() => {
            toggleBookmark(verse, text)
            toast(bookmarked ? 'Bookmark removed' : 'Verse bookmarked')
          }}
        >
          {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </Button>

        {player.supported && (
          <Button
            variant="soft"
            onClick={() => {
              player.start(verse, { single: false })
              onClose()
            }}
          >
            <Play size={17} />
            Listen from here
          </Button>
        )}

        <Button variant="soft" onClick={doShare}>
          <Share2 size={17} />
          Share
        </Button>

        <Button
          variant="soft"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${text} — ${ref}`)
              toast('Copied to clipboard')
            } catch {
              toast('Copy is not available here')
            }
          }}
        >
          <ClipboardCopy size={17} />
          Copy
        </Button>
      </div>

      <div className="verse-highlight">
        <div className="verse-highlight-head">
          <Highlighter size={15} />
          Highlight
        </div>
        <div className="hl-swatches">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              className={`hl-swatch ${hl === c.id ? 'on' : ''}`}
              style={{ background: c.swatch }}
              title={c.label}
              aria-label={`Highlight ${c.label}`}
              onClick={() => {
                setHighlight(verse, hl === c.id ? null : c.id)
              }}
            />
          ))}
          {hl && (
            <button className="hl-clear" onClick={() => setHighlight(verse, null)} title="Remove highlight">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="verse-note">
        <div className="verse-highlight-head">
          <NotebookPen size={15} />
          {noteOpen ? 'Your note' : 'Add a note'}
        </div>
        {noteOpen ? (
          <>
            <textarea
              className="note-input"
              rows={4}
              value={noteDraft}
              placeholder="What is God showing you in this verse?"
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <div className="note-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  saveNote(verse, '', text)
                  setNoteDraft('')
                  setNoteOpen(false)
                  toast('Note removed')
                }}
              >
                <Trash2 size={15} />
                Remove
              </Button>
              <Button
                onClick={() => {
                  saveNote(verse, noteDraft, text)
                  toast('Note saved')
                  onClose()
                }}
              >
                Save note
              </Button>
            </div>
          </>
        ) : (
          <Button variant="soft" onClick={() => setNoteOpen(true)}>
            <NotebookPen size={15} />
            Write a note
          </Button>
        )}
      </div>
    </Sheet>
  )
}
