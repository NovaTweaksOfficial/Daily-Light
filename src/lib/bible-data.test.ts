import { describe, expect, it } from 'vitest'
import type { BibleIndex, BookData } from '@/types'
import index from '../../public/bible/index.json'
import genesis from '../../public/bible/web/01.json'
import john from '../../public/bible/web/43.json'
import psalms from '../../public/bible/web/19.json'
import song from '../../public/bible/web/22.json'

const IDX = index as unknown as BibleIndex

describe('Bible index integrity', () => {
  it('has all 66 books in canonical order', () => {
    expect(IDX.books.length).toBe(66)
    expect(IDX.books[0].name).toBe('Genesis')
    expect(IDX.books[39].name).toBe('Matthew')
    expect(IDX.books[65].name).toBe('Revelation')
    expect(IDX.books.map((b) => b.id)).toEqual(IDX.books.map((_, i) => i + 1))
  })

  it('has the canonical chapter and verse totals', () => {
    expect(IDX.books.reduce((a, b) => a + b.chapters, 0)).toBe(1189)
    expect(IDX.totalVerses).toBe(31103)
    expect(IDX.books.reduce((a, b) => a + b.verses, 0)).toBe(31103)
  })

  it('verseCounts match per-book verse totals', () => {
    for (const b of IDX.books) {
      expect(b.verseCounts.length).toBe(b.chapters)
      expect(b.verseCounts.reduce((x, y) => x + y, 0)).toBe(b.verses)
    }
  })
})

describe('book data spot checks', () => {
  it('Genesis 1:1 is intact (no corrupted footnotes)', () => {
    const gen = genesis as unknown as BookData
    expect(gen.chapters[0].verses[0]).toBe('In the beginning, God created the heavens and the earth.')
  })

  it('John 3:16 reads correctly', () => {
    const j = john as unknown as BookData
    const text = j.chapters[2].verses[15]
    expect(text).toContain('For God so loved the world')
    expect(text).toContain('believes in him should not perish')
    expect(text).not.toContain('(Elohim)') // the corruption that ruled out other sources
  })

  it('Psalm 23 has its superscription and 6 verses', () => {
    const ps = psalms as unknown as BookData
    const ch = ps.chapters[22]
    expect(ch.verses.length).toBe(6)
    expect(ch.title).toBe('A Psalm by David.')
    // The WEB renders the divine name as "Yahweh" in the Old Testament.
    expect(ch.verses[0]).toContain('Yahweh is my shepherd')
  })

  it('Song of Solomon carries speaker labels', () => {
    const s = song as unknown as BookData
    expect(Object.keys(s.chapters[0].hv ?? {}).length).toBeGreaterThan(0)
  })

  it('John includes words-of-Jesus ranges for red letters', () => {
    const j = john as unknown as BookData
    const wj = j.chapters[2].wj // John 3
    expect(wj).toBeTruthy()
    expect(Object.keys(wj ?? {}).length).toBeGreaterThan(0)
    // Ranges must be in bounds for their verse.
    for (const [verseNum, ranges] of Object.entries(wj ?? {})) {
      const text = j.chapters[2].verses[Number(verseNum) - 1]
      for (const [start, end] of ranges) {
        expect(start).toBeGreaterThanOrEqual(0)
        expect(end).toBeLessThanOrEqual(text.length)
        expect(start).toBeLessThan(end)
      }
    }
  })
})
