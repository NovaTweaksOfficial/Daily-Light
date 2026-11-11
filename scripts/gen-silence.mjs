#!/usr/bin/env node
/**
 * gen-silence.mjs — writes public/silence.wav
 *
 * A tiny, completely silent WAV file. It exists for one reason: on iOS, a
 * home-screen PWA routes Web Speech output through the ambient audio
 * category, so the Silent switch mutes narration completely. Playing this
 * file during a tap forces iOS to switch the audio session to the playback
 * category, after which speech is audible even in Silent mode.
 *
 * The file contains no samples at all — it is inaudible by construction.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '..', 'public', 'silence.wav')

const SAMPLE_RATE = 8000
const SECONDS = 0.25
const samples = Math.floor(SAMPLE_RATE * SECONDS)

const header = Buffer.alloc(44)
const dataSize = samples // 8-bit mono

header.write('RIFF', 0, 'ascii')
header.writeUInt32LE(36 + dataSize, 4)
header.write('WAVE', 8, 'ascii')
header.write('fmt ', 12, 'ascii')
header.writeUInt32LE(16, 16) // PCM chunk size
header.writeUInt16LE(1, 20) // format = PCM
header.writeUInt16LE(1, 22) // channels = mono
header.writeUInt32LE(SAMPLE_RATE, 24)
header.writeUInt32LE(SAMPLE_RATE, 28) // byte rate
header.writeUInt16LE(1, 32) // block align
header.writeUInt16LE(8, 34) // bits per sample
header.write('data', 36, 'ascii')
header.writeUInt32LE(dataSize, 40)

// 8-bit PCM silence is the value 128 (mid-point).
const data = Buffer.alloc(dataSize, 128)

mkdirSync(dirname(OUT), { recursive: true })
const out = Buffer.concat([header, data])
writeFileSync(OUT, out)
console.log(`✓ public/silence.wav (${out.length} bytes, ${SECONDS}s of silence)`)
