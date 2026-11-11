import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Bookmark, Highlight, HighlightColor, HistoryItem, LastRead, Note, VerseRef } from '@/types'
import { dbDelete, dbGet, dbGetAll, dbSet } from '@/lib/storage'
import { chapterKey, verseId } from '@/lib/bible'
import { computeStreak } from '@/lib/plans'
import { dateKey } from '@/lib/daily'

export interface StreakInfo {
  current: number
  longest: number
}

interface LibraryCtx {
  ready: boolean
  bookmarks: Bookmark[]
  highlights: Highlight[]
  notes: Note[]
  history: HistoryItem[]
  lastRead: LastRead | null
  chaptersRead: Set<string>
  streak: StreakInfo

  hasBookmark: (ref: VerseRef) => boolean
  toggleBookmark: (ref: VerseRef, text: string) => void
  highlightFor: (ref: VerseRef) => HighlightColor | null
  setHighlight: (ref: VerseRef, color: HighlightColor | null) => void
  noteFor: (ref: VerseRef) => Note | null
  saveNote: (ref: VerseRef, note: string, text: string) => void
  deleteNote: (ref: VerseRef) => void

  recordVisit: (book: number, chapter: number) => void
  markChapterRead: (book: number, chapter: number) => void
  isChapterRead: (book: number, chapter: number) => boolean
  bookProgress: (book: number, total: number) => number
  markActivityToday: () => void
}

const Ctx = createContext<LibraryCtx | null>(null)

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [lastRead, setLastRead] = useState<LastRead | null>(null)
  const [chaptersRead, setChaptersRead] = useState<Set<string>>(new Set())
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set())

  /* Hydration --------------------------------------------------------------- */
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [bm, hl, nt, hist, lr, read, activity] = await Promise.all([
        dbGetAll<Bookmark>('bookmarks'),
        dbGetAll<Highlight>('highlights'),
        dbGetAll<Note>('notes'),
        dbGetAll<HistoryItem>('history'),
        dbGet<LastRead>('progress', 'lastRead'),
        dbGet<string[]>('progress', 'chaptersRead'),
        dbGet<string[]>('progress', 'activityDates'),
      ])
      if (!alive) return
      setBookmarks(bm.sort((a, b) => b.createdAt - a.createdAt))
      setHighlights(hl.sort((a, b) => b.createdAt - a.createdAt))
      setNotes(nt.sort((a, b) => b.updatedAt - a.updatedAt))
      setHistory(hist.sort((a, b) => b.at - a.at).slice(0, 60))
      setLastRead(lr ?? null)
      setChaptersRead(new Set(read ?? []))
      setActivityDates(new Set(activity ?? []))
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  const markActivityToday = useCallback(() => {
    const today = dateKey()
    setActivityDates((prev) => {
      if (prev.has(today)) return prev
      const next = new Set(prev)
      next.add(today)
      dbSet('progress', 'activityDates', [...next]).catch(() => undefined)
      return next
    })
  }, [])

  const streak = useMemo(() => computeStreak([...activityDates]), [activityDates])

  /* Bookmarks ---------------------------------------------------------------- */
  const hasBookmark = useCallback(
    (ref: VerseRef) => bookmarks.some((b) => b.id === verseId(ref.book, ref.chapter, ref.verse)),
    [bookmarks],
  )

  const toggleBookmark = useCallback((ref: VerseRef, text: string) => {
    const id = verseId(ref.book, ref.chapter, ref.verse)
    setBookmarks((prev) => {
      const existing = prev.find((b) => b.id === id)
      if (existing) {
        dbDelete('bookmarks', id).catch(() => undefined)
        return prev.filter((b) => b.id !== id)
      }
      const bm: Bookmark = { ...ref, id, text, createdAt: Date.now() }
      dbSet('bookmarks', id, bm).catch(() => undefined)
      return [bm, ...prev]
    })
  }, [])

  /* Highlights ---------------------------------------------------------------- */
  const highlightFor = useCallback(
    (ref: VerseRef) => highlights.find((h) => h.id === verseId(ref.book, ref.chapter, ref.verse))?.color ?? null,
    [highlights],
  )

  const setHighlight = useCallback((ref: VerseRef, color: HighlightColor | null) => {
    const id = verseId(ref.book, ref.chapter, ref.verse)
    setHighlights((prev) => {
      const filtered = prev.filter((h) => h.id !== id)
      if (!color) {
        dbDelete('highlights', id).catch(() => undefined)
        return filtered
      }
      const hl: Highlight = { ...ref, id, color, createdAt: Date.now() }
      dbSet('highlights', id, hl).catch(() => undefined)
      return [hl, ...filtered]
    })
  }, [])

  /* Notes --------------------------------------------------------------------- */
  const noteFor = useCallback(
    (ref: VerseRef) => notes.find((n) => n.id === verseId(ref.book, ref.chapter, ref.verse)) ?? null,
    [notes],
  )

  const saveNote = useCallback((ref: VerseRef, note: string, text: string) => {
    const id = verseId(ref.book, ref.chapter, ref.verse)
    setNotes((prev) => {
      const filtered = prev.filter((n) => n.id !== id)
      if (!note.trim()) {
        dbDelete('notes', id).catch(() => undefined)
        return filtered
      }
      const n: Note = { ...ref, id, note: note.trim(), text, updatedAt: Date.now() }
      dbSet('notes', id, n).catch(() => undefined)
      return [n, ...filtered]
    })
  }, [])

  const deleteNote = useCallback((ref: VerseRef) => {
    const id = verseId(ref.book, ref.chapter, ref.verse)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    dbDelete('notes', id).catch(() => undefined)
  }, [])

  /* Reading state -------------------------------------------------------------- */
  const recordVisit = useCallback(
    (book: number, chapter: number) => {
      const id = chapterKey(book, chapter)
      const at = Date.now()
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.id !== id)
        const item: HistoryItem = { id, book, chapter, at }
        dbSet('history', id, item).catch(() => undefined)
        return [item, ...filtered].slice(0, 60)
      })
      const lr: LastRead = { book, chapter, at }
      setLastRead(lr)
      dbSet('progress', 'lastRead', lr).catch(() => undefined)
      markActivityToday()
    },
    [markActivityToday],
  )

  const markChapterRead = useCallback(
    (book: number, chapter: number) => {
      const key = chapterKey(book, chapter)
      setChaptersRead((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev)
        next.add(key)
        dbSet('progress', 'chaptersRead', [...next]).catch(() => undefined)
        return next
      })
      markActivityToday()
    },
    [markActivityToday],
  )

  const isChapterRead = useCallback(
    (book: number, chapter: number) => chaptersRead.has(chapterKey(book, chapter)),
    [chaptersRead],
  )

  const bookProgress = useCallback(
    (book: number, total: number) => {
      let read = 0
      for (let c = 1; c <= total; c++) if (chaptersRead.has(chapterKey(book, c))) read++
      return read
    },
    [chaptersRead],
  )

  const value = useMemo<LibraryCtx>(
    () => ({
      ready,
      bookmarks,
      highlights,
      notes,
      history,
      lastRead,
      chaptersRead,
      streak,
      hasBookmark,
      toggleBookmark,
      highlightFor,
      setHighlight,
      noteFor,
      saveNote,
      deleteNote,
      recordVisit,
      markChapterRead,
      isChapterRead,
      bookProgress,
      markActivityToday,
    }),
    [
      ready, bookmarks, highlights, notes, history, lastRead, chaptersRead, streak,
      hasBookmark, toggleBookmark, highlightFor, setHighlight, noteFor, saveNote, deleteNote,
      recordVisit, markChapterRead, isChapterRead, bookProgress, markActivityToday,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibrary(): LibraryCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
