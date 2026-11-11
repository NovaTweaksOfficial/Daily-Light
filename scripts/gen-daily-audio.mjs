#!/usr/bin/env node
/**
 * gen-daily-audio.mjs — generates audio for the daily verses using macOS `say`.
 *
 * Produces public/audio/daily/NNN.m4a (AAC) for each curated daily verse, so
 * the Daily tab works on devices where Web Speech is broken (notably iOS
 * home-screen PWAs).
 *
 * Requires macOS (say + afconvert). Optional — the app falls back to the Web
 * Speech API when an audio file is missing.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'daily')
const TMP = path.join(ROOT, '.tmp-audio')

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

// Parse the daily verse references from src/lib/daily.ts
const dailySrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'daily.ts'), 'utf8')
const matches = [...dailySrc.matchAll(/\{\s*book:\s*(\d+),\s*chapter:\s*(\d+),\s*verse:\s*(\d+)/g)]
const refs = matches.map((m) => ({ book: +m[1], chapter: +m[2], verse: +m[3] }))
console.log(`Found ${refs.length} daily verses`)

// Load the Bible data to get the verse text
function verseText(bookId, chapter, verse) {
  const idx = String(bookId).padStart(2, '0')
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'bible', 'web', `${idx}.json`), 'utf8'))
  return data.chapters[chapter - 1].verses[verse - 1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

// Book names for the spoken header
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'bible', 'index.json'), 'utf8'))
function bookName(id) {
  return index.books.find((b) => b.id === id)?.name ?? `Book ${id}`
}

let done = 0
for (const [i, ref] of refs.entries()) {
  const out = path.join(OUT_DIR, `${String(i).padStart(3, '0')}.m4a`)
  if (fs.existsSync(out)) {
    done++
    continue
  }
  const text = verseText(ref.book, ref.chapter, ref.verse)
  const header = `${bookName(ref.book)}, chapter ${ref.chapter}, verse ${ref.verse}.`
  const spoken = `${header} ${text}`
  const aiff = path.join(TMP, `${i}.aiff`)
  try {
    execFileSync('say', ['-v', 'Samantha', '-o', aiff, spoken], { stdio: 'pipe' })
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, out], { stdio: 'pipe' })
    fs.unlinkSync(aiff)
    done++
    if (done % 10 === 0 || done === refs.length) {
      console.log(`  ${done}/${refs.length} done`)
    }
  } catch (err) {
    console.error(`  FAILED verse ${i} (${ref.book}:${ref.chapter}:${ref.verse}):`, err.message)
  }
}

// cleanup
try { fs.rmSync(TMP, { recursive: true, force: true }) } catch {}
console.log(`\nFinished: ${done}/${refs.length} audio files in public/audio/daily/`)
