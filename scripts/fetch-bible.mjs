#!/usr/bin/env node
/**
 * fetch-bible.mjs — downloads the official World English Bible (WEB) in USFM
 * from ebible.org and converts the 66 canonical books into the JSON format
 * used by the app:
 *
 *   public/bible/index.json       book metadata (names, chapter + verse counts)
 *   public/bible/web/NN.json      one file per book (lazy-loaded by the app)
 *
 * Run:  node scripts/fetch-bible.mjs
 * Optionally pass a path to a previously downloaded eng-web_usfm.zip or an
 * extracted directory: node scripts/fetch-bible.mjs /path/to/usfm
 *
 * The World English Bible is dedicated to the public domain.
 * Source: https://ebible.org/find/show.php?id=eng-web
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import os from 'node:os'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT_DIR = path.join(ROOT, 'public', 'bible')
const BOOK_DIR = path.join(OUT_DIR, 'web')
const DOWNLOAD = 'https://ebible.org/Scriptures/eng-web_usfm.zip'

/** Canonical 66 books in order: [eBible code, name, display abbr, chapter count] */
const BOOKS = [
  ['GEN', 'Genesis', 'Gen', 50],
  ['EXO', 'Exodus', 'Exo', 40],
  ['LEV', 'Leviticus', 'Lev', 27],
  ['NUM', 'Numbers', 'Num', 36],
  ['DEU', 'Deuteronomy', 'Deu', 34],
  ['JOS', 'Joshua', 'Jos', 24],
  ['JDG', 'Judges', 'Jdg', 21],
  ['RUT', 'Ruth', 'Rut', 4],
  ['1SA', '1 Samuel', '1Sa', 31],
  ['2SA', '2 Samuel', '2Sa', 24],
  ['1KI', '1 Kings', '1Ki', 22],
  ['2KI', '2 Kings', '2Ki', 25],
  ['1CH', '1 Chronicles', '1Ch', 29],
  ['2CH', '2 Chronicles', '2Ch', 36],
  ['EZR', 'Ezra', 'Ezr', 10],
  ['NEH', 'Nehemiah', 'Neh', 13],
  ['EST', 'Esther', 'Est', 10],
  ['JOB', 'Job', 'Job', 42],
  ['PSA', 'Psalms', 'Psa', 150],
  ['PRO', 'Proverbs', 'Pro', 31],
  ['ECC', 'Ecclesiastes', 'Ecc', 12],
  ['SNG', 'Song of Solomon', 'Sng', 8],
  ['ISA', 'Isaiah', 'Isa', 66],
  ['JER', 'Jeremiah', 'Jer', 52],
  ['LAM', 'Lamentations', 'Lam', 5],
  ['EZK', 'Ezekiel', 'Ezk', 48],
  ['DAN', 'Daniel', 'Dan', 12],
  ['HOS', 'Hosea', 'Hos', 14],
  ['JOL', 'Joel', 'Jol', 3],
  ['AMO', 'Amos', 'Amo', 9],
  ['OBA', 'Obadiah', 'Oba', 1],
  ['JON', 'Jonah', 'Jon', 4],
  ['MIC', 'Micah', 'Mic', 7],
  ['NAM', 'Nahum', 'Nam', 3],
  ['HAB', 'Habakkuk', 'Hab', 3],
  ['ZEP', 'Zephaniah', 'Zep', 3],
  ['HAG', 'Haggai', 'Hag', 2],
  ['ZEC', 'Zechariah', 'Zec', 14],
  ['MAL', 'Malachi', 'Mal', 4],
  ['MAT', 'Matthew', 'Mat', 28],
  ['MRK', 'Mark', 'Mrk', 16],
  ['LUK', 'Luke', 'Luk', 24],
  ['JHN', 'John', 'Jhn', 21],
  ['ACT', 'Acts', 'Act', 28],
  ['ROM', 'Romans', 'Rom', 16],
  ['1CO', '1 Corinthians', '1Co', 16],
  ['2CO', '2 Corinthians', '2Co', 13],
  ['GAL', 'Galatians', 'Gal', 6],
  ['EPH', 'Ephesians', 'Eph', 6],
  ['PHP', 'Philippians', 'Php', 4],
  ['COL', 'Colossians', 'Col', 4],
  ['1TH', '1 Thessalonians', '1Th', 5],
  ['2TH', '2 Thessalonians', '2Th', 3],
  ['1TI', '1 Timothy', '1Ti', 6],
  ['2TI', '2 Timothy', '2Ti', 4],
  ['TIT', 'Titus', 'Tit', 3],
  ['PHM', 'Philemon', 'Phm', 1],
  ['HEB', 'Hebrews', 'Heb', 13],
  ['JAS', 'James', 'Jas', 5],
  ['1PE', '1 Peter', '1Pe', 5],
  ['2PE', '2 Peter', '2Pe', 3],
  ['1JN', '1 John', '1Jn', 5],
  ['2JN', '2 John', '2Jn', 1],
  ['3JN', '3 John', '3Jn', 1],
  ['JUD', 'Jude', 'Jud', 1],
  ['REV', 'Revelation', 'Rev', 22],
]

/** eBible numeric file prefixes for the canonical books. */
const FILE_PREFIX = {
  GEN: '02', EXO: '03', LEV: '04', NUM: '05', DEU: '06', JOS: '07', JDG: '08', RUT: '09',
  '1SA': '10', '2SA': '11', '1KI': '12', '2KI': '13', '1CH': '14', '2CH': '15', EZR: '16',
  NEH: '17', EST: '18', JOB: '19', PSA: '20', PRO: '21', ECC: '22', SNG: '23', ISA: '24',
  JER: '25', LAM: '26', EZK: '27', DAN: '28', HOS: '29', JOL: '30', AMO: '31', OBA: '32',
  JON: '33', MIC: '34', NAM: '35', HAB: '36', ZEP: '37', HAG: '38', ZEC: '39', MAL: '40',
  MAT: '70', MRK: '71', LUK: '72', JHN: '73', ACT: '74', ROM: '75', '1CO': '76',
  '2CO': '77', GAL: '78', EPH: '79', PHP: '80', COL: '81', '1TH': '82', '2TH': '83',
  '1TI': '84', '2TI': '85', TIT: '86', PHM: '87', HEB: '88', JAS: '89', '1PE': '90',
  '2PE': '91', '1JN': '92', '2JN': '93', '3JN': '94', JUD: '95', REV: '96',
}

/* ------------------------------------------------------------------ */
/* Verse assembly                                                     */
/* ------------------------------------------------------------------ */

const FOOTNOTE_RE = /\\f[ea]? .*?\\f\*/g
const XREF_RE = /\\x .*?\\x\*/g
/** Strong's word lists: \w text|attrs\w* (text kept, markup dropped). */
const WLIST_RE = /^\\\+?w\s+([^\\]*?)(?:\|[^\\]*)?\\\+?w\*/
/** Any other USFM inline marker token (\wj, \qs, \it, \nd, …) is dropped. */
const MARKER_RE = /^\\\+?[a-zA-Z]+[0-9]*\*?/

/**
 * Assembles one verse from raw USFM fragments while normalizing whitespace
 * and tracking words-of-Jesus ranges against the FINAL verse string (this is
 * where the previous version drifted: ranges were measured before joining).
 */
class VerseAssembler {
  constructor() {
    this.text = ''
    this.jesusStart = -1
    this.jRanges = []
    this.done = null
  }

  get last() {
    return this.text[this.text.length - 1]
  }

  get canSpace() {
    return this.text.length > 0 && this.last !== ' ' && this.last !== '\n'
  }

  emitChar(ch) {
    if (ch === ' ' || ch === '\t') {
      if (this.canSpace) this.text += ' '
    } else if (ch === '\n') {
      if (this.text.length > 0 && this.last !== '\n') this.text += '\n'
    } else {
      this.text += ch
    }
  }

  emit(str) {
    for (const ch of str) this.emitChar(ch)
  }

  /** Appends a raw USFM fragment. `joiner` is ' ' / '\n' between fragments. */
  append(raw, joiner) {
    if (this.done) throw new Error('verse already finished')
    if (joiner === '\n') {
      if (this.text.length > 0 && this.last !== '\n') this.text += '\n'
    } else if (joiner === ' ' && this.canSpace) {
      this.text += ' '
    }

    let s = raw
    s = s.replace(FOOTNOTE_RE, ' ')
    s = s.replace(XREF_RE, ' ')

    let i = 0
    while (i < s.length) {
      const rest = s.slice(i)

      // Strong's word list — keep the word, drop the markup/attributes.
      const wl = rest.match(WLIST_RE)
      if (wl) {
        this.emit(wl[1])
        i += wl[0].length
        continue
      }

      // Words of Jesus — track ranges against the final text.
      if (rest.startsWith('\\wj')) {
        if (rest.startsWith('\\wj*')) {
          if (this.jesusStart >= 0 && this.text.length > this.jesusStart) {
            this.jRanges.push([this.jesusStart, this.text.length])
          }
          this.jesusStart = -1
          i += 4
        } else {
          this.jesusStart = this.text.length
          i += 3
        }
        continue
      }

      // Any other marker token is dropped.
      const mk = rest.match(MARKER_RE)
      if (mk) {
        i += mk[0].length
        continue
      }

      this.emitChar(s[i])
      i++
    }
  }

  finish() {
    if (this.done) return this.done
    let text = this.text.replace(/\s+$/, '')
    // Clamp ranges to the trimmed text.
    const ranges = []
    for (const [a, b] of this.jRanges) {
      const end = Math.min(b, text.length)
      const start = Math.min(a, end)
      if (end > start) ranges.push([start, end])
    }
    this.done = { text, jRanges: ranges }
    return this.done
  }
}

/** Marker/whitespace cleanup for non-verse text (titles, speakers, notes). */
function cleanPlain(raw) {
  const asm = new VerseAssembler()
  asm.append(raw, null)
  return asm.finish().text
}

/* ------------------------------------------------------------------ */
/* USFM file -> book object                                           */
/* ------------------------------------------------------------------ */

function parseBook(file, id, name, osis, expectedChapters) {
  const raw = fs.readFileSync(file, 'utf8')
  const lines = raw.split('\n').map((l) => l.replace(/\r$/, ''))

  const chapters = [] // { title?, verses: [{n, asm, rawFirst}], hv: {}, tv: {} }
  let curChapter = null
  let curVerse = null
  let pendingSpeaker = null
  const issues = []

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue

    if (t.startsWith('\\c ')) {
      const n = parseInt(t.slice(3), 10)
      curChapter = { verses: [], wj: {}, hv: {}, tv: {} }
      chapters.push(curChapter)
      curVerse = null
      if (n !== chapters.length) issues.push(`\\c ${n} out of sequence (expected ${chapters.length})`)
      continue
    }

    if (t.startsWith('\\v ')) {
      const m = t.match(/^\\v (\d+)\s*(.*)$/)
      if (!curChapter) {
        issues.push(`verse before first \\c: ${t.slice(0, 40)}`)
        continue
      }
      const n = parseInt(m[1], 10)
      if (n !== curChapter.verses.length + 1) {
        issues.push(`${name} ch ${chapters.length}: verse ${n} out of sequence (expected ${curChapter.verses.length + 1})`)
      }
      const asm = new VerseAssembler()
      if (m[2]) asm.append(m[2], null)
      curVerse = { n, asm, rawFirst: m[2] || '' }
      curChapter.verses.push(curVerse)
      // A handful of WEB verses keep their number but have no body — the text
      // lives in a footnote instead (e.g. Acts 8:37). Capture it as a textual
      // note so the app can display it honestly.
      if (pendingSpeaker) {
        curChapter.hv[String(n)] = pendingSpeaker
        pendingSpeaker = null
      }
      continue
    }

    // Chapter headings (psalm titles, Psalm book divisions, section titles)
    let hm = t.match(/^\\(d|ms1|ms2|s1|s2)\s+(.*)$/)
    if (hm) {
      if (curChapter) {
        const txt = cleanPlain(hm[2])
        if (txt) curChapter.title = curChapter.title ? `${curChapter.title} ${txt}` : txt
      }
      continue
    }
    hm = t.match(/^\\sp\s+(.*)$/) // Song of Solomon speaker labels
    if (hm) {
      pendingSpeaker = cleanPlain(hm[1])
      continue
    }

    // Poetry / paragraph / list lines — continuation of the current verse.
    // Poetry lines get a newline (preserves Psalm/Proverbs line breaks).
    hm = t.match(/^(\\q[123]?|\\p|\\m|\\mi|\\nb|\\pc|\\pr|\\pi\d?|\\li\d?|\\b|\\cls?|\\qte)\s*(.*)$/)
    if (hm) {
      if (hm[2] && curVerse) {
        curVerse.asm.append(hm[2], hm[1].startsWith('\\q') ? '\n' : ' ')
      }
      continue
    }

    // Book-level metadata lines are skipped.
    if (/^\\(id|ide|h|toc\d|mt\d?|ili\d?|ip|is\d?|imt\d?|ie|rem|cl|cp|ca)/.test(t)) continue

    // Anything else inside a chapter is treated as plain continuation text.
    if (curVerse) {
      curVerse.asm.append(t, ' ')
    } else if (curChapter) {
      issues.push(`orphan line in ${name} ch ${chapters.length}: ${t.slice(0, 50)}`)
    }
  }

  // Manuscript-note verses (kept number, text in a footnote) — must run
  // BEFORE building outChapters so the tv map is included in the output.
  for (const ch of chapters) {
    for (const v of ch.verses) {
      if (v.asm.finish().text) continue
      if (!v.rawFirst) continue
      const fn = v.rawFirst.match(/\\ft\s+(.*?)\\f\*/)
      if (fn) {
        const note = cleanPlain(fn[1])
        if (note) ch.tv[String(v.n)] = note
      }
    }
  }

  const outChapters = chapters.map((ch) => {
    const verses = ch.verses.map((v) => v.asm.finish().text)
    const obj = { verses }
    if (ch.title) obj.title = ch.title
    if (Object.keys(ch.hv).length) obj.hv = ch.hv
    if (Object.keys(ch.tv).length) obj.tv = ch.tv
    // Words-of-Jesus ranges, keyed by verse number, already in final offsets.
    for (const v of ch.verses) {
      const { jRanges } = v.asm.finish()
      if (jRanges.length) ch.wj[String(v.n)] = jRanges
    }
    if (Object.keys(ch.wj).length) obj.wj = ch.wj
    return obj
  })

  if (outChapters.length !== expectedChapters) {
    issues.push(`${name}: found ${outChapters.length} chapters, expected ${expectedChapters}`)
  }
  return { book: { id, name, osis, chapters: outChapters }, issues }
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

function unzipInto(zip, dir) {
  fs.mkdirSync(dir, { recursive: true })
  execSync(`unzip -oq ${JSON.stringify(zip)} -d ${JSON.stringify(dir)}`)
}

async function main() {
  // 1. Obtain the USFM source (download or use the provided path)
  let src = process.argv[2]
  let tmpDir = null
  if (!src) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-usfm-'))
    const zip = path.join(tmpDir, 'eng-web_usfm.zip')
    console.log(`Downloading ${DOWNLOAD} ...`)
    execSync(`curl -fsSL -o ${JSON.stringify(zip)} ${DOWNLOAD}`, { stdio: 'inherit' })
    unzipInto(zip, tmpDir)
    src = tmpDir
  } else if (fs.statSync(src).isFile() && src.endsWith('.zip')) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-usfm-'))
    unzipInto(src, tmpDir)
    src = tmpDir
  }
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    console.error(`USFM source directory not found: ${src}`)
    process.exit(1)
  }

  // 2. Parse all books
  fs.mkdirSync(BOOK_DIR, { recursive: true })
  const indexBooks = []
  const allIssues = []
  let totalVerses = 0
  let totalWjVerses = 0
  let totalHv = 0
  let totalTv = 0

  BOOKS.forEach(([osis, name, abbr, chapterCount], i) => {
    const id = i + 1
    const prefix = FILE_PREFIX[osis]
    const candidates = [`${prefix}-${osis}eng-web.usfm`, `${prefix}-${osis}.usfm`]
    const file = candidates.map((c) => path.join(src, c)).find((f) => fs.existsSync(f))
    if (!file) {
      allIssues.push(`MISSING FILE for ${name} (${prefix}-${osis})`)
      return
    }
    const { book, issues } = parseBook(file, id, name, osis, chapterCount)
    allIssues.push(...issues)

    let verses = 0
    book.chapters.forEach((ch, ci) => {
      verses += ch.verses.length
      ch.verses.forEach((v, vi) => {
        if ((!v || !v.trim()) && !ch.tv?.[String(vi + 1)]) {
          allIssues.push(`${name} ${ci + 1}:${vi + 1} empty verse`)
        }
        if (/\\|\|strong/.test(v)) allIssues.push(`${name} ${ci + 1}:${vi + 1} leftover markup: ${v.slice(0, 80)}`)
      })
      for (const [vn, ranges] of Object.entries(ch.wj || {})) {
        const text = ch.verses[Number(vn) - 1] ?? ''
        for (const [s, e] of ranges) {
          if (!(s >= 0 && e > s && e <= text.length)) {
            allIssues.push(`${name} ${ci + 1}:${vn} wj range out of bounds: [${s},${e}] vs length ${text.length}`)
          }
        }
      }
      totalWjVerses += Object.keys(ch.wj || {}).length
      totalHv += Object.keys(ch.hv || {}).length
      totalTv += Object.keys(ch.tv || {}).length
    })
    totalVerses += verses

    const verseCounts = book.chapters.map((c) => c.verses.length)
    indexBooks.push({
      id,
      name,
      abbr,
      osis,
      testament: id <= 39 ? 'OT' : 'NT',
      chapters: book.chapters.length,
      verseCounts,
      verses,
    })

    const out = JSON.stringify(book)
    fs.writeFileSync(path.join(BOOK_DIR, `${String(id).padStart(2, '0')}.json`), out)
    console.log(`  ✓ ${String(id).padStart(2, '0')} ${name.padEnd(20)} ${String(book.chapters.length).padStart(3)} ch  ${String(verses).padStart(4)} vs  ${(out.length / 1024).toFixed(0).padStart(4)} KB`)
  })

  // 3. Write the index
  const index = {
    id: 'web',
    name: 'World English Bible',
    shortName: 'WEB',
    license: 'Public Domain',
    source: 'https://ebible.org/find/show.php?id=eng-web',
    updatedAt: new Date().toISOString().slice(0, 10),
    totalVerses,
    books: indexBooks,
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index))

  // 4. Report
  console.log('\n────────────────────────────────────────────')
  console.log(`Books:      ${indexBooks.length}/66`)
  console.log(`Chapters:   ${indexBooks.reduce((a, b) => a + b.chapters, 0)}`)
  console.log(`Verses:     ${totalVerses}`)
  console.log(`Jesus-text: ${totalWjVerses} verses with red-letter ranges`)
  console.log(`Speakers:   ${totalHv} speaker headings (Song of Solomon)`)
  console.log(`Notes:      ${totalTv} manuscript-note verses`)
  console.log(`Issues:     ${allIssues.length}`)
  for (const issue of allIssues.slice(0, 25)) console.log(`  ! ${issue}`)

  // 5. Spot samples for eyeballing
  const john = JSON.parse(fs.readFileSync(path.join(BOOK_DIR, '43.json'), 'utf8'))
  const j316 = john.chapters[2].verses[15]
  const j316wj = john.chapters[2].wj?.['16']
  console.log(`\nJohn 3:16 = ${JSON.stringify(j316)}`)
  console.log(`John 3:16 wj = ${JSON.stringify(j316wj)}`)
  if (j316wj) {
    for (const [s, e] of j316wj) console.log(`  red: “${j316.slice(s, e)}”`)
  }
  const gen = JSON.parse(fs.readFileSync(path.join(BOOK_DIR, '01.json'), 'utf8'))
  console.log(`Genesis 1:1 = ${JSON.stringify(gen.chapters[0].verses[0])}`)
  const ps = JSON.parse(fs.readFileSync(path.join(BOOK_DIR, '19.json'), 'utf8'))
  console.log(`Psalm 23:1 = ${JSON.stringify(ps.chapters[22].verses[0])}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
