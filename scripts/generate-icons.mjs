/**
 * Renders the app icon (dark tile + amber progress arc) to PNG at the sizes the
 * web manifest needs. Pure Node — no image deps — so it runs anywhere.
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [0x0a, 0x0a, 0x0b]
const TRACK = [0x1f, 0x1f, 0x23]
const ACCENT = [0xf2, 0xa9, 0x3b]

function mix(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t))
}

function render(size) {
  const s = size / 512
  const cx = size / 2
  const cy = size / 2
  const radius = 150 * s
  const half = 17 * s // half of the 34px stroke
  const dot = 34 * s
  const corner = 112 * s
  const px = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x + 0.5
      const fy = y + 0.5

      // rounded-rect alpha
      const qx = Math.max(corner - fx, fx - (size - corner), 0)
      const qy = Math.max(corner - fy, fy - (size - corner), 0)
      const cornerDist = Math.hypot(qx, qy)
      const alpha = clamp01(corner - cornerDist + 0.5)

      const d = Math.hypot(fx - cx, fy - cy)
      let color = BG

      // ring: full grey track, amber over the top-right 180°
      const onRing = clamp01(half - Math.abs(d - radius) + 0.5)
      if (onRing > 0) {
        const angle = Math.atan2(fy - cy, fx - cx) // -PI..PI, 0 = east
        const inArc = angle >= -Math.PI / 2 && angle <= Math.PI / 2
        color = mix(BG, inArc ? ACCENT : TRACK, onRing)
      }

      // centre dot
      const inDot = clamp01(dot - d + 0.5)
      if (inDot > 0) color = mix(color, ACCENT, inDot)

      const i = (y * size + x) * 4
      px[i] = color[0]
      px[i + 1] = color[1]
      px[i + 2] = color[2]
      px[i + 3] = Math.round(alpha * 255)
    }
  }
  return px
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function toPng(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const file = new URL(`../public/icon-${size}.png`, import.meta.url)
  writeFileSync(file, toPng(size, render(size)))
  console.log(`wrote public/icon-${size}.png`)
}
