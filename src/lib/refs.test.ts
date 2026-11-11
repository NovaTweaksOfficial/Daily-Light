import { describe, expect, it } from 'vitest'
import { parseReference } from '@/lib/refs'
import type { BibleIndex } from '@/types'
import index from '../../public/bible/index.json'

const IDX = index as unknown as BibleIndex

describe('parseReference', () => {
  it('parses canonical references', () => {
    expect(parseReference('John 3:16', IDX)).toEqual({ book: 43, chapter: 3, verse: 16 })
    expect(parseReference('Genesis 1:1', IDX)).toEqual({ book: 1, chapter: 1, verse: 1 })
    expect(parseReference('Revelation 21:4', IDX)).toEqual({ book: 66, chapter: 21, verse: 4 })
  })

  it('parses book-only and book+chapter forms', () => {
    expect(parseReference('Genesis', IDX)).toEqual({ book: 1, chapter: 1 })
    expect(parseReference('ps 23', IDX)).toEqual({ book: 19, chapter: 23 })
    expect(parseReference('1 cor 13', IDX)).toEqual({ book: 46, chapter: 13 })
    expect(parseReference('iii john', IDX)).toEqual({ book: 64, chapter: 1 })
  })

  it('expands common abbreviations', () => {
    expect(parseReference('jn 3', IDX)?.book).toBe(43)
    expect(parseReference('deut 6', IDX)?.book).toBe(5)
    expect(parseReference('mt 5', IDX)?.book).toBe(40)
    expect(parseReference('php 4', IDX)?.book).toBe(50)
    expect(parseReference('rev 22', IDX)?.book).toBe(66)
  })

  it('matches name prefixes', () => {
    expect(parseReference('gene 1', IDX)?.book).toBe(1)
    expect(parseReference('exodu 2', IDX)?.book).toBe(2)
  })

  it('treats a bare number as a verse in one-chapter books', () => {
    expect(parseReference('Jude 2', IDX)).toEqual({ book: 65, chapter: 1, verse: 2 })
    expect(parseReference('Philemon 7', IDX)).toEqual({ book: 57, chapter: 1, verse: 7 })
    expect(parseReference('Obadiah 4', IDX)).toEqual({ book: 31, chapter: 1, verse: 4 })
    expect(parseReference('2 John 5', IDX)).toEqual({ book: 63, chapter: 1, verse: 5 })
    expect(parseReference('3 John 3', IDX)).toEqual({ book: 64, chapter: 1, verse: 3 })
    expect(parseReference('Jude 99', IDX)).toBeNull() // only 25 verses
    expect(parseReference('Jude 2:3', IDX)).toBeNull() // chapter 2 does not exist
    expect(parseReference('Jude 1:2', IDX)).toEqual({ book: 65, chapter: 1, verse: 2 })
  })

  it('rejects out-of-range chapters and verses', () => {
    expect(parseReference('John 99', IDX)).toBeNull()
    expect(parseReference('John 3:999', IDX)).toBeNull()
    expect(parseReference('Psalm 119:176', IDX)).not.toBeNull()
    expect(parseReference('Psalm 119:177', IDX)).toBeNull()
  })

  it('returns null for keyword-like input (not a reference)', () => {
    expect(parseReference('love', IDX)).toBeNull()
    expect(parseReference('the kingdom', IDX)).toBeNull()
    expect(parseReference('shepherd', IDX)).toBeNull()
  })

  it('tolerates punctuation and spacing', () => {
    expect(parseReference('  John   3:16 ', IDX)).toEqual({ book: 43, chapter: 3, verse: 16 })
    expect(parseReference('John 3.16', IDX)).toEqual({ book: 43, chapter: 3, verse: 16 })
  })
})
