/* Reading plan definitions, deterministic day-by-day generation, and streaks. */

import type { BibleIndex, PlanDay, PlanDef, PlanState } from '@/types'

export const PLAN_DEFS: PlanDef[] = [
  {
    id: 'bible365',
    name: 'The Bible in a Year',
    description: 'Every chapter of all 66 books across 365 balanced days.',
    days: 365,
    scope: 'whole',
  },
  {
    id: 'nt90',
    name: 'New Testament in 90 Days',
    description: 'All 27 New Testament books across three months.',
    days: 90,
    scope: 'nt',
  },
  {
    id: 'ot180',
    name: 'Old Testament in 180 Days',
    description: 'The complete Old Testament across six months.',
    days: 180,
    scope: 'ot',
  },
  {
    id: 'gospels30',
    name: 'Life of Jesus in 30 Days',
    description: 'Matthew, Mark, Luke, and John across one month.',
    days: 30,
    scope: 'gospels',
  },
]

export function planDefById(id: string): PlanDef | undefined {
  return PLAN_DEFS.find((p) => p.id === id)
}

function bookIdsForScope(index: BibleIndex, scope: string): number[] {
  if (scope === 'nt') return index.books.filter((b) => b.testament === 'NT').map((b) => b.id)
  if (scope === 'ot') return index.books.filter((b) => b.testament === 'OT').map((b) => b.id)
  if (scope === 'gospels') return [40, 41, 42, 43]
  return index.books.map((b) => b.id)
}

/**
 * Builds plan days weighted by verse counts so each day feels similar in
 * length. Every chapter appears exactly once, and every day gets at least one
 * passage (when there are enough chapters).
 */
export function generatePlanDays(
  index: BibleIndex,
  scope: string,
  days: number,
  bookIds?: number[],
): PlanDay[] {
  const ids = bookIds ?? bookIdsForScope(index, scope)
  const chapters: { book: number; chapter: number; weight: number }[] = []
  for (const id of ids) {
    const meta = index.books.find((b) => b.id === id)
    if (!meta) continue
    for (let c = 1; c <= meta.chapters; c++) {
      chapters.push({ book: id, chapter: c, weight: Math.max(1, meta.verseCounts[c - 1] ?? 20) })
    }
  }
  days = Math.max(1, Math.min(days, 730))
  const totalWeight = chapters.reduce((a, c) => a + c.weight, 0)

  const out: PlanDay[] = []
  let ci = 0
  let consumed = 0
  for (let d = 0; d < days; d++) {
    const end = ((d + 1) * totalWeight) / days
    const passages: { book: number; chapter: number }[] = []
    // Keep consuming chapters until this day's weight budget is met.
    // The `passages.length === 0` guard guarantees at least one chapter a day.
    while (ci < chapters.length && (passages.length === 0 || consumed < end - 1e-6)) {
      passages.push({ book: chapters[ci].book, chapter: chapters[ci].chapter })
      consumed += chapters[ci].weight
      ci++
    }
    if (passages.length === 0 && out.length > 0) {
      // More days than chapters — fold the empty day into the previous one.
      continue
    }
    out.push({ passages })
  }
  // Sweep any rounding leftovers into the final day.
  while (ci < chapters.length) {
    const last = out[out.length - 1]
    last.passages.push({ book: chapters[ci].book, chapter: chapters[ci].chapter })
    ci++
  }
  return out
}

/** Days for a plan instance (built-in defs regenerate deterministically). */
export function planDaysFor(index: BibleIndex, plan: PlanState): PlanDay[] {
  if (plan.custom) {
    return generatePlanDays(index, 'custom', plan.custom.days, plan.custom.books)
  }
  const def = planDefById(plan.defId)
  return generatePlanDays(index, def?.scope ?? 'whole', def?.days ?? 365)
}

/** "Genesis 1–3" or "John 3:16–5:21" style labels for a plan day. */
export function dayLabel(index: BibleIndex, day: PlanDay): string {
  if (day.passages.length === 0) return 'Rest day'
  const groups: { book: number; from: number; to: number }[] = []
  for (const p of day.passages) {
    const g = groups.find((g) => g.book === p.book)
    if (!g) groups.push({ book: p.book, from: p.chapter, to: p.chapter })
    else g.to = Math.max(g.to, p.chapter)
  }
  return groups
    .map((g) => {
      const name = index.books.find((b) => b.id === g.book)?.abbr ?? `Book ${g.book}`
      return g.from === g.to ? `${name} ${g.from}` : `${name} ${g.from}–${g.to}`
    })
    .join(' · ')
}

/* Streaks ------------------------------------------------------------------- */

/**
 * Computes reading streaks from activity dates ('YYYY-MM-DD' strings).
 * A streak counts consecutive days ending today (or yesterday, so today can
 * still be earned).
 */
export function computeStreak(dates: string[]): { current: number; longest: number } {
  const set = new Set(dates)
  if (set.size === 0) return { current: 0, longest: 0 }

  const today = new Date()
  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Current streak: walk back from today (allow "yesterday" start).
  let anchor = new Date(today)
  if (!set.has(keyOf(anchor))) {
    anchor.setDate(anchor.getDate() - 1)
    if (!set.has(keyOf(anchor))) return { current: 0, longest: longestRun(set) }
  }
  let current = 0
  while (set.has(keyOf(anchor))) {
    current++
    anchor.setDate(anchor.getDate() - 1)
  }
  return { current, longest: Math.max(longestRun(set), current) }
}

function longestRun(set: Set<string>): number {
  const sorted = [...set].sort()
  let longest = 0
  let run = 0
  let prev: Date | null = null
  for (const key of sorted) {
    const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) continue
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1) run++
    else run = 1
    prev = d
    if (run > longest) longest = run
  }
  return longest
}

export function percentComplete(plan: PlanState, totalDays: number): number {
  if (!totalDays) return 0
  return Math.round((plan.completedDays.length / totalDays) * 100)
}

/** The day the user should resume on (first uncompleted day). */
export function currentDayIndex(plan: PlanState): number {
  const done = new Set(plan.completedDays)
  for (let i = 0; i < 3650; i++) {
    if (!done.has(i)) return i
  }
  return 0
}
