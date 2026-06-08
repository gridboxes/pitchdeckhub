// Member colour = a solid colour plus a "graininess" amount (Arc-style).
// Persisted in the DB `color` text column as JSON: {"c":"#hex","g":0..1}.
// Legacy plain "#rrggbb" values still work (treated as grain 0).

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export const DEFAULT_COLOR = { c: '#dd4b63', g: 0 }

// Accepts: {c,g} object, JSON string, legacy "#hex", or null → always returns {c,g}.
export function parseColor(value) {
  if (!value) return { ...DEFAULT_COLOR }
  if (typeof value === 'object') return { c: value.c || DEFAULT_COLOR.c, g: clamp(value.g || 0, 0, 1) }
  const s = String(value).trim()
  if (s.startsWith('{')) {
    try { const o = JSON.parse(s); return { c: o.c || DEFAULT_COLOR.c, g: clamp(o.g || 0, 0, 1) } }
    catch { return { ...DEFAULT_COLOR } }
  }
  if (s.startsWith('#')) return { c: s, g: 0 }
  return { ...DEFAULT_COLOR }
}

export function serializeColor({ c, g }) {
  return JSON.stringify({ c, g: +clamp(Number(g) || 0, 0, 1).toFixed(3) })
}

// A repeating film-grain noise as a CSS background-image (or 'none' when g≈0).
export function grainUrl(g) {
  if (!g || g <= 0.001) return 'none'
  const alpha = clamp(g * 0.55, 0, 0.6).toFixed(3)
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'>` +
    `<filter id='g'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/>` +
    `<feComponentTransfer><feFuncA type='linear' slope='${alpha}'/></feComponentTransfer>` +
    `</filter>` +
    `<rect width='100%' height='100%' filter='url(#g)'/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
