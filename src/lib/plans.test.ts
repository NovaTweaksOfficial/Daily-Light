import { describe, expect, it } from 'vitest'
import { computeStreak, generatePlanDays, dayLabel } from '@/lib/plans'
import type { BibleIndex } from '@/types'
import index from '../../public/bible/index.json'

const IDX = index as unknown as BibleIndex

describe('generatePlanDays', () => {
  it('covers every chapter exactly once for the whole-Bible plan', () => {
    const days = generatePlanDays(IDX, 'whole', 365)
    const expected: string[] = []
    for (const b of IDX.books) for (let c = 1; c <= b.chapters; c++) expected.push(`${b.id}:${c}`)

    const actual = days.flatMap((d) => d.passages.map((p) => `${p.book}:${p.chapter}`))
    expect(actual.length).toBe(expected.length)
    expect([...actual].sort()).toEqual([...expected].sort())
    expect(new Set(actual).size).toBe(actual.length) // no duplicates
  })

  it('gives every day at least one passage', () => {
    for (const days of [365, 90, 30, 7]) {
      const plan = generatePlanDays(IDX, 'whole', days)
      expect(plan.length).toBeGreaterThan(0)
      for (const day of plan) expect(day.passages.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('splits the New Testament across 90 days', () => {
    const ntChapters = IDX.books
      .filter((b) => b.testament === 'NT')
      .reduce((a, b) => a + b.chapters, 0)
    const days = generatePlanDays(IDX, 'nt', 90)
    const total = days.reduce((a, d) => a + d.passages.length, 0)
    expect(total).toBe(ntChapters)
    expect(days.every((d) => d.passages.every((p) => p.book >= 40 && p.book <= 66))).toBe(true)
  })

  it('honors custom book selections', () => {
    const days = generatePlanDays(IDX, 'custom', 12, [40, 41, 42, 43])
    const books = new Set(days.flatMap((d) => d.passages.map((p) => p.book)))
    expect([...books].sort()).toEqual([40, 41, 42, 43])
    const gospelsChapters = IDX.books
      .filter((b) => [40, 41, 42, 43].includes(b.id))
      .reduce((a, b) => a + b.chapters, 0)
    expect(days.reduce((a, d) => a + d.passages.length, 0)).toBe(gospelsChapters)
  })

  it('is deterministic', () => {
    const a = generatePlanDays(IDX, 'whole', 365)
    const b = generatePlanDays(IDX, 'whole', 365)
    expect(a).toEqual(b)
  })

  it('formats day labels', () => {
    const label = dayLabel(IDX, { passages: [{ book: 1, chapter: 1 }, { book: 1, chapter: 2 }, { book: 1, chapter: 3 }] })
    expect(label).toBe('Gen 1–3')
    const single = dayLabel(IDX, { passages: [{ book: 43, chapter: 3 }] })
    expect(single).toBe('Jhn 3')
  })
})

describe('computeStreak', () => {
  const key = (offsetDays: number) => {
    const d = new Date()
    d.setDate(d.getDate() - offsetDays)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  it('counts consecutive days ending today', () => {
    expect(computeStreak([key(0), key(1), key(2)]).current).toBe(3)
  })

  it('lets today still be earned when yesterday was read', () => {
    expect(computeStreak([key(1), key(2)]).current).toBe(2)
  })

  it('breaks on a gap', () => {
    expect(computeStreak([key(0), key(2)]).current).toBe(1)
    expect(computeStreak([key(3)]).current).toBe(0)
  })

  it('tracks the longest run even after the current streak breaks', () => {
    const s = computeStreak([key(0), key(1), key(2), key(3), key(10), key(11)])
    expect(s.current).toBe(4)
    expect(s.longest).toBe(4)
  })

  it('handles empty input', () => {
    expect(computeStreak([])).toEqual({ current: 0, longest: 0 })
  })
})
