/* Loads Bible data: index.json + per-book files (cached in memory and IDB so
 * the app works offline and re-loads instantly). */

import type { BibleIndex, BookData, BookMeta } from '@/types'
import { dbGet, dbSet } from '@/lib/storage'

let indexPromise: Promise<BibleIndex> | null = null
const memoryBooks = new Map<number, BookData>()

function url(path: string) {
  return `${import.meta.env.BASE_URL}bible/${path}`
}

/** Loads (and caches) the Bible index with all book metadata. */
export function loadIndex(): Promise<BibleIndex> {
  if (!indexPromise) {
    indexPromise = fetch(url('index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load Bible index (${r.status})`)
        return r.json() as Promise<BibleIndex>
      })
      .catch(async (err) => {
        // Try the IDB mirror as a fallback (offline first visit edge case).
        const cached = await dbGet<BibleIndex>('cache', 'index')
        if (cached) return cached
        throw err
      })
      .then((idx) => {
        dbSet('cache', 'index', idx).catch(() => undefined)
        return idx
      })
  }
  return indexPromise
}

export async function ensureIndex(): Promise<BibleIndex> {
  return loadIndex()
}

/** Synchronous metadata lookup — only valid after loadIndex() resolved. */
export function bookMeta(id: number, index?: BibleIndex): BookMeta | undefined {
  const idx = index ?? resolvedIndex
  return idx?.books.find((b) => b.id === id)
}

let resolvedIndex: BibleIndex | null = null
export function setResolvedIndex(idx: BibleIndex | null) {
  resolvedIndex = idx
}
export function getResolvedIndex(): BibleIndex | null {
  return resolvedIndex
}

/** Loads one book (chapters, verses) with memory → IDB → network caching. */
export async function loadBook(id: number): Promise<BookData> {
  const mem = memoryBooks.get(id)
  if (mem) return mem

  const cacheKey = `book-${id}`
  const cached = await dbGet<BookData>('cache', cacheKey)
  if (cached && cached.chapters?.length) {
    memoryBooks.set(id, cached)
    return cached
  }

  const res = await fetch(url(`web/${String(id).padStart(2, '0')}.json`))
  if (!res.ok) throw new Error(`Failed to load book ${id} (${res.status})`)
  const book = (await res.json()) as BookData
  memoryBooks.set(id, book)
  dbSet('cache', cacheKey, book).catch(() => undefined)
  return book
}

/** Loads every book (for full-text search). Reports progress 0..1. */
export async function loadAllBooks(onProgress?: (done: number, total: number) => void): Promise<BookData[]> {
  const index = await loadIndex()
  const total = index.books.length
  let done = 0
  const results = await Promise.all(
    index.books.map(async (meta) => {
      const book = await loadBook(meta.id)
      done++
      onProgress?.(done, total)
      return book
    }),
  )
  return results
}

export function areAllBooksLoaded(): boolean {
  return memoryBooks.size >= 66
}

/* Passage helpers --------------------------------------------------------- */

export function verseId(book: number, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`
}

export function chapterKey(book: number, chapter: number): string {
  return `${book}:${chapter}`
}

export function refString(book: number, chapter: number, verse?: number, index?: BibleIndex): string {
  const idx = index ?? resolvedIndex
  const meta = idx?.books.find((b) => b.id === book)
  const name = meta ? meta.name : `Book ${book}`
  return verse ? `${name} ${chapter}:${verse}` : `${name} ${chapter}`
}

export function nextChapter(
  book: number,
  chapter: number,
  index: BibleIndex,
): { book: number; chapter: number } | null {
  const meta = index.books.find((b) => b.id === book)
  if (!meta) return null
  if (chapter < meta.chapters) return { book, chapter: chapter + 1 }
  if (book < 66) return { book: book + 1, chapter: 1 }
  return null
}

export function prevChapter(
  book: number,
  chapter: number,
  index: BibleIndex,
): { book: number; chapter: number } | null {
  if (chapter > 1) return { book, chapter: chapter - 1 }
  if (book > 1) {
    const meta = index.books.find((b) => b.id === book - 1)!
    return { book: book - 1, chapter: meta.chapters }
  }
  return null
}

export function totalChapterCount(index: BibleIndex): number {
  return index.books.reduce((a, b) => a + b.chapters, 0)
}

/** Splits a verse into plain/words-of-Jesus segments for red-letter display. */
export function redLetterSegments(
  text: string,
  ranges: [number, number][] | undefined,
): { text: string; jesus: boolean }[] {
  if (!ranges || !ranges.length) return [{ text, jesus: false }]
  const out: { text: string; jesus: boolean }[] = []
  let pos = 0
  for (const [start, end] of ranges) {
    if (start > pos) out.push({ text: text.slice(pos, start), jesus: false })
    out.push({ text: text.slice(start, end), jesus: true })
    pos = end
  }
  if (pos < text.length) out.push({ text: text.slice(pos), jesus: false })
  return out
}
