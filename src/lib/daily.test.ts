import { describe, expect, it } from 'vitest'
import { dailyVerseForDate, dailyVerseForDay, dateKey, dayNumber } from '@/lib/daily'
import { DAILY_VERSES } from '@/lib/daily'

describe('daily verse rotation', () => {
  it('is deterministic for the same date', () => {
    const a = dailyVerseForDate(new Date(2026, 10, 10))
    const b = dailyVerseForDate(new Date(2026, 10, 10))
    expect(a).toEqual(b)
  })

  it('changes from day to day', () => {
    const seen = new Set<string>()
    for (let d = 0; d < 30; d++) {
      const v = dailyVerseForDay(d)
      seen.add(`${v.book}:${v.chapter}:${v.verse}`)
    }
    expect(seen.size).toBe(30)
  })

  it('wraps after the full rotation', () => {
    const n = DAILY_VERSES.length
    const a = dailyVerseForDay(0)
    const b = dailyVerseForDay(n)
    expect(a).toEqual(b)
  })

  it('produces valid references for every curated verse', () => {
    for (const v of DAILY_VERSES) {
      expect(v.book).toBeGreaterThanOrEqual(1)
      expect(v.book).toBeLessThanOrEqual(66)
      expect(v.chapter).toBeGreaterThanOrEqual(1)
      expect(v.verse).toBeGreaterThanOrEqual(1)
      expect(v.devotion.length).toBeGreaterThan(10)
    }
  })

  it('formats date keys in local time', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('day numbers advance by exactly one per day', () => {
    const a = dayNumber(new Date(2026, 10, 10))
    const b = dayNumber(new Date(2026, 10, 11))
    expect(b - a).toBe(1)
  })
})
