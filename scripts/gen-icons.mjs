/* Generates the Daily Light app icons as PNGs with zero dependencies.
 * Brand: a warm gold rounded square with a white cross.
 * Outputs: public/icons/icon-192.png, icon-512.png, icon-512-maskable.png,
 *          apple-touch-icon.png (180px)
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

/* PNG encoding ----------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // filter bytes per scanline (0 = none)
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

/* Drawing helpers ------------------------------------------------------------------ */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Signed distance to a rounded rectangle centered at (cx, cy). */
function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r)
  const dy = Math.abs(y - cy) - (hh - r)
  const ax = Math.max(dx, 0)
  const ay = Math.max(dy, 0)
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - r
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const GOLD_LIGHT = [0xe6, 0xbb, 0x48]
const GOLD_DEEP = [0x8a, 0x62, 0x0c]
const WHITE = [0xff, 0xfd, 0xf5]

/**
 * Draws the icon. `maskable` = full-bleed background (launcher masks it),
 * otherwise a rounded square with transparent corners.
 */
function drawIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const bgR = maskable ? 0 : size * 0.225 // corner radius
  const inset = maskable ? 0 : Math.round(size * 0.012)
  const crossScale = maskable ? 0.86 : 1

  // Cross geometry, derived from the brand SVG (24-unit viewBox).
  const vb = 24
  const crossCx = 12 / vb
  const vTop = 3.2 / vb
  const vBot = 20.8 / vb
  const vHalfW = (5.2 / vb / 2) * crossScale
  const hHalfW = (15 / vb / 2) * crossScale
  const hCy = 10.7 / vb
  const hHalfH = (5.2 / vb / 2) * crossScale
  const barR = 1.6 / vb * crossScale

  const vCy = (vTop + vBot) / 2
  const vHalfH = (vBot - vTop) / 2 * crossScale

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Supersample 2x2 for smooth edges.
      let rAcc = 0
      let gAcc = 0
      let bAcc = 0
      let aAcc = 0
      for (const [ox, oy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        const sx = x + ox
        const sy = y + oy

        const bgDist = sdRoundRect(sx, sy, size / 2, size / 2, size / 2 - inset, size / 2 - inset, bgR)
        const bgA = clamp(0.5 - bgDist, 0, 1)
        if (bgA <= 0) continue

        const dv = sdRoundRect(sx, sy, crossCx * size, vCy * size, vHalfW * size, vHalfH * size, barR * size)
        const dh = sdRoundRect(sx, sy, crossCx * size, hCy * size, hHalfW * size, hHalfH * size, barR * size)
        const crossA = clamp(0.5 - Math.min(dv, dh), 0, 1)

        // Warm gold gradient along the diagonal.
        const t = clamp((sx / size + sy / size - 0.4) / 1.2, 0, 1)
        const base = mix(GOLD_LIGHT, GOLD_DEEP, t)
        const color = crossA > 0 ? mix(base, WHITE, crossA) : base
        rAcc += color[0] * bgA
        gAcc += color[1] * bgA
        bAcc += color[2] * bgA
        aAcc += bgA
      }
      const i = (y * size + x) * 4
      if (aAcc <= 0) {
        px[i] = 0
        px[i + 1] = 0
        px[i + 2] = 0
        px[i + 3] = 0
      } else {
        px[i] = Math.round(rAcc / aAcc)
        px[i + 1] = Math.round(gAcc / aAcc)
        px[i + 2] = Math.round(bAcc / aAcc)
        px[i + 3] = Math.round((aAcc / 4) * 255)
      }
    }
  }
  return encodePNG(size, size, px)
}

/* Write files ------------------------------------------------------------------------- */

mkdirSync(OUT_DIR, { recursive: true })

const files = [
  ['icon-192.png', drawIcon(192)],
  ['icon-512.png', drawIcon(512)],
  ['icon-512-maskable.png', drawIcon(512, { maskable: true })],
  ['apple-touch-icon.png', drawIcon(180, { maskable: true })],
]

for (const [name, buf] of files) {
  writeFileSync(join(OUT_DIR, name), buf)
  console.log(`✓ public/icons/${name} (${buf.length} bytes)`)
}
