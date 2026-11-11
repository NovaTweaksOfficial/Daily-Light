import { useMemo } from 'react'
import type { ChapterData, VerseRef } from '@/types'
import { redLetterSegments } from '@/lib/bible'

/** Renders verse text with poetry line breaks and red-letter words of Jesus. */
export function VerseText({ text, jesus, className }: { text: string; jesus?: [number, number][]; className?: string }) {
  const segs = useMemo(() => redLetterSegments(text, jesus), [text, jesus])
  return (
    <span className={className}>
      {segs.map((s, i) => (
        <span key={i} className={s.jesus ? 'wj' : undefined}>
          {s.text.split('\n').map((part, j, arr) => (
            <span key={j}>
              {j > 0 && <span className="v-line-indent" />}
              {part}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

export interface VerseRowProps {
  verse: number
  chapter: ChapterData
  book: number
  chapterNumber: number
  active?: boolean
  target?: boolean
  bookmarked?: boolean
  highlightColor?: string | null
  notePreview?: string | null
  onTap: (ref: VerseRef) => void
}

export function VerseRow({
  verse,
  chapter,
  book,
  chapterNumber,
  active,
  target,
  bookmarked,
  highlightColor,
  notePreview,
  onTap,
}: VerseRowProps) {
  const text = chapter.verses[verse - 1] ?? ''
  const jesus = chapter.wj?.[String(verse)]
  const note = chapter.tv?.[String(verse)]
  const speaker = chapter.hv?.[String(verse)]

  if (!text && note) {
    // Manuscript-note verse (e.g. Acts 8:37 in the WEB).
    return (
      <p className={`verse-row verse-note ${active ? 'reading' : ''}`} id={`v-${verse}`}>
        <span className="vnum">{verse}</span>
        <span className="vtext">{note}</span>
      </p>
    )
  }
  if (!text) return null

  return (
    <>
      {speaker && <p className="verse-speaker">{speaker}</p>}
      <p
        className={['verse-row', active ? 'reading' : '', target ? 'flash' : '', highlightColor ? `hl-${highlightColor}` : '']
          .filter(Boolean)
          .join(' ')}
        id={`v-${verse}`}
        data-verse={verse}
        onClick={() => onTap({ book, chapter: chapterNumber, verse })}
      >
        <span className="vnum">{verse}</span>
        <span className="vtext">
          <VerseText text={text} jesus={jesus} />
          {note && (
            <span className="v-footnote">
              ({verse} {note})
            </span>
          )}
          {bookmarked && (
            <span className="verse-flag" title="Bookmarked">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M6 2h12a1 1 0 0 1 1 1v18.5a.5.5 0 0 1-.8.4L12 17.2l-6.2 4.7a.5.5 0 0 1-.8-.4V3a1 1 0 0 1 1-1z" />
              </svg>
            </span>
          )}
          {notePreview && (
            <span className="verse-flag note-flag" title={notePreview}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M6 2h12a1 1 0 0 1 1 1v19l-6.2-3.7a1 1 0 0 0-1.1 0L5 22V3a1 1 0 0 1 1-1zm4.7 4.3v1.4h2.9V11H8.6V6.3c0-1.7 1.2-2.9 3-2.9s2.9 1.1 2.9 2.7h-1.7c0-.7-.5-1.2-1.2-1.2s-1.3.5-1.3 1.4z" />
              </svg>
            </span>
          )}
        </span>
      </p>
    </>
  )
}
