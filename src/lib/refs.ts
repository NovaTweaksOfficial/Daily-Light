/* Parses user input like "John 3:16", "1 cor 13", "ps 23" into a passage. */

import type { BibleIndex, BookMeta } from '@/types'

/** Extra common abbreviations per book name (lowercase, no spaces). */
const ALIASES: Record<string, number> = {
  gen: 1, ge: 1, gn: 1, ex: 2, exod: 2, exo: 2, lev: 3, lv: 3, levit: 3,
  num: 4, nb: 4, numbers: 4, deu: 5, de: 5, dt: 5, deut: 5, dueteronomy: 5,
  jos: 6, josh: 6, jdg: 7, judges: 7, ru: 8, rut: 8, ruth: 8,
  '1sa': 9, '1sam': 9, '1sm': 9, '2sa': 10, '2sam': 10, '2sm': 10,
  '1ki': 11, '1kgs': 11, '1king': 11, '2ki': 12, '2kgs': 12, '2king': 12,
  '1ch': 13, '1chr': 13, '1chron': 13, '2ch': 14, '2chr': 14, '2chron': 14,
  ezr: 15, ez: 15, ne: 16, neh: 16, nehem: 16, est: 17, esth: 17, es: 17,
  jb: 18, job: 18, ps: 19, psalm: 19, psalms: 19, pslm: 19, psm: 19, psa: 19,
  pr: 20, prov: 20, pro: 20, prv: 20, ec: 21, ecc: 21, eccl: 21,
  song: 22, sos: 22, sng: 22, canticles: 22, songs: 22,
  is: 23, isa: 23, isai: 23, jer: 24, jr: 24, jere: 24, lam: 25, la: 25,
  eze: 26, ezk: 26, ezek: 26, dn: 27, dan: 27,
  hos: 28, ho: 28, joe: 29, joel: 29, joes: 29, am: 30, amos: 30,
  ob: 31, oba: 31, obad: 31, jnh: 32, jon: 32, jonah: 32,
  mic: 33, mc: 33, nah: 34, nam: 34, na: 34, hab: 35, hb: 35,
  zep: 36, zeph: 36, zp: 36, hag: 37, hg: 37, haggai: 37,
  zec: 38, zech: 38, zc: 38, mal: 39, ml: 39, malachi: 39,
  mt: 40, matt: 40, mat: 40, mk: 41, mrk: 41, mar: 41, luk: 42, lk: 42, lu: 42,
  jn: 43, jhn: 43, joh: 43, john: 43, ac: 44, acts: 44, act: 44,
  ro: 45, rom: 45, roma: 45, '1co': 46, '1cor': 46, '2co': 47, '2cor': 47,
  ga: 48, gal: 48, galatians: 48, eph: 49, ep: 49,
  php: 50, phil: 50, phpilippians: 50, col: 51, cl: 51,
  '1th': 52, '1thess': 52, '1thes': 52, '2th': 53, '2thess': 53, '2thes': 53,
  '1ti': 54, '1tim': 54, '2ti': 55, '2tim': 55, tit: 56, ti: 56, titus: 56,
  phm: 57, philem: 57, pm: 57, heb: 58, jas: 59, jam: 59, james: 59,
  '1pe': 60, '1pet': 60, '1pt': 60, '2pe': 61, '2pet': 61, '2pt': 61,
  '1jn': 62, '1joh': 62, '1john': 62, '1jo': 62,
  '2jn': 63, '2joh': 63, '2john': 63, '2jo': 63,
  '3jn': 64, '3joh': 64, '3john': 64, '3jo': 64,
  jud: 65, jude: 65, ju: 65, rev: 66, re: 66, rv: 66, revelation: 66, apoc: 66,
}

export interface ParsedRef {
  book: number
  chapter: number
  verse?: number
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(\d)\s+/, '$1') // "1 corinthians" -> "1corinthians"
}

function romanToInt(s: string): number | null {
  const map: Record<string, number> = { i: 1, ii: 2, iii: 3 }
  const v = map[s.toLowerCase()]
  return v ?? null
}

/** Find the book id the user most likely means by `name`. */
export function matchBook(name: string, index: BibleIndex): BookMeta | null {
  const norm = normalizeName(name)
  if (!norm) return null

  // "1 john" style with a space between number and word
  const numPrefix = norm.match(/^([1-3])\s*(.+)$/)
  if (numPrefix) {
    const rest = numPrefix[2].replace(/\s+/g, '')
    const id = ALIASES[`${numPrefix[1]}${rest.slice(0, 3)}`] ?? ALIASES[`${numPrefix[1]}${rest}`]
    if (id) return index.books.find((b) => b.id === id) ?? null
  }

  // Roman numeral style ("ii john")
  const roman = norm.match(/^(i{1,3})\s+(.+)$/)
  if (roman) {
    const n = romanToInt(roman[1])
    const rest = roman[2].replace(/\s+/g, '')
    if (n) {
      const id = ALIASES[`${n}${rest.slice(0, 3)}`] ?? ALIASES[`${n}${rest}`]
      if (id) return index.books.find((b) => b.id === id) ?? null
    }
  }

  const compact = norm.replace(/\s+/g, '')

  // Exact alias hit
  if (ALIASES[compact]) return index.books.find((b) => b.id === ALIASES[compact]) ?? null

  // Exact name / abbr / osis hit
  for (const b of index.books) {
    const n = normalizeName(b.name)
    if (n === norm || b.abbr.toLowerCase() === compact || b.osis.toLowerCase() === compact) return b
  }

  // Prefix match on full names (e.g. "gene" -> Genesis)
  const prefixMatches = index.books.filter((b) => normalizeName(b.name).startsWith(compact))
  if (prefixMatches.length === 1) return prefixMatches[0]

  // Prefix match on aliases (e.g. "phili" -> Php)
  const aliasPrefix = Object.entries(ALIASES).filter(([a]) => a.startsWith(compact) && a.length >= compact.length)
  if (aliasPrefix.length === 1) return index.books.find((b) => b.id === aliasPrefix[0][1]) ?? null

  return null
}

/**
 * Parses a reference string. Returns null when the input is not a reference
 * (it is probably a keyword search instead).
 */
export function parseReference(input: string, index: BibleIndex): ParsedRef | null {
  const cleaned = input.trim().replace(/\s+/g, ' ')
  if (!cleaned || cleaned.length > 40) return null

  const m = cleaned.match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z ]*?)\s*(\d{1,3})?(?:\s*[:.]\s*(\d{1,3}))?$/)
  if (!m) return null

  const namePart = m[1].trim()
  const hasNumbers = m[2] !== undefined
  if (!namePart) return null

  const book = matchBook(namePart, index)
  if (!book) return null

  // Require at least 2 letters so "a", "i" alone don't count as references,
  // and require numbers for short/ambiguous inputs.
  if (!hasNumbers && namePart.replace(/[^a-z]/gi, '').length < 3) return null

  let chapter = 1
  let verse: number | undefined

  if (m[2] && m[3]) {
    // "John 3:16" — explicit chapter and verse.
    chapter = parseInt(m[2], 10)
    if (chapter < 1 || chapter > book.chapters) return null
    verse = parseInt(m[3], 10)
    const verses = book.verseCounts[chapter - 1] ?? 0
    if (verse < 1 || verse > verses) return null
  } else if (m[2]) {
    const n = parseInt(m[2], 10)
    if (book.chapters === 1) {
      // One-chapter books (Jude, Philemon, 2–3 John, Obadiah): a bare
      // number is a verse — "Jude 2" means Jude 1:2.
      const verses = book.verseCounts[0] ?? 0
      if (n < 1 || n > verses) return null
      verse = n
    } else {
      if (n < 1 || n > book.chapters) return null
      chapter = n
    }
  } else if (m[3]) {
    // A verse separator with no chapter ("John :16") is not a reference.
    return null
  }

  return { book: book.id, chapter, verse }
}
