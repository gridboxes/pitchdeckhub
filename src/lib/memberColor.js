// Member colour = a base colour with an optional two-tone gradient.
// Persisted in the DB `color` text column as JSON: {"c":"#hex","grad":0..1,"ang":0..360,"sp":0..360}.
//   grad = gradient strength (0 = flat solid)
//   ang  = gradient direction in degrees
//   sp   = hue spread: degrees to rotate the gradient's 2nd colour (0 = mono sheen)
// Legacy values still work: a plain "#rrggbb", or older JSON shapes (extra keys ignored).

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const wrap = a => ((a % 360) + 360) % 360

export function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export const DEFAULT_COLOR = { c: '#dd4b63', grad: 0, ang: 135, sp: 0 }

// Accepts: {c,grad,ang,sp} object, JSON string, legacy "#hex", or null → always returns the full shape.
export function parseColor(value) {
  if (!value) return { ...DEFAULT_COLOR }
  if (typeof value === 'object') {
    return { c: value.c || DEFAULT_COLOR.c, grad: clamp(value.grad || 0, 0, 1), ang: wrap(value.ang ?? 135), sp: wrap(value.sp || 0) }
  }
  const s = String(value).trim()
  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s)
      return { c: o.c || DEFAULT_COLOR.c, grad: clamp(o.grad || 0, 0, 1), ang: wrap(o.ang ?? 135), sp: wrap(o.sp || 0) }
    } catch { return { ...DEFAULT_COLOR } }
  }
  if (s.startsWith('#')) return { ...DEFAULT_COLOR, c: s, grad: 0 }
  return { ...DEFAULT_COLOR }
}

export function serializeColor({ c, grad, ang, sp }) {
  return JSON.stringify({ c, grad: +clamp(grad || 0, 0, 1).toFixed(3), ang: Math.round(wrap(ang || 0)), sp: Math.round(wrap(sp || 0)) })
}

export function baseHex(value) {
  return typeof value === 'string' ? parseColor(value).c : (value?.c || DEFAULT_COLOR.c)
}

// The gradient's 2nd colour: a lighter sheen of the base hue, optionally rotated
// `sp` degrees around the wheel for a true two-tone (duotone) gradient.
export function sheenHex({ c, grad, sp = 0 }) {
  const { h, s, l } = hexToHsl(c)
  // Keep more saturation as the spread widens, so duotones stay vivid (not washed).
  const spreadAmt = Math.min(Math.abs(((sp + 180) % 360) - 180) / 180, 1) // 0..1
  const satDrop = 16 * grad * (1 - spreadAmt)
  return hslToHex(wrap(h + sp), clamp(s - satDrop, 0, 100), clamp(l + (34 - 18 * spreadAmt) * grad, 0, 96))
}

// CSS `background` value — a solid hex when flat, else a linear (duotone) gradient.
export function gradientCss(orb) {
  const o = typeof orb === 'string' ? parseColor(orb) : orb
  if (!o.grad || o.grad <= 0.01) return o.c
  return `linear-gradient(${Math.round(o.ang)}deg, ${sheenHex(o)}, ${o.c})`
}
