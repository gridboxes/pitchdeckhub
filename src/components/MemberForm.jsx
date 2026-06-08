import { useState, useRef } from 'react'
import { Sparkles, Sun, Moon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'
import { parseColor, clamp } from '../lib/memberColor'

const BASE_COLORS = [
  { hue: 350, sat: 68, name: 'Rosé' },
  { hue: 4,   sat: 74, name: 'Crimson' },
  { hue: 14,  sat: 78, name: 'Coral' },
  { hue: 26,  sat: 82, name: 'Tangerine' },
  { hue: 38,  sat: 86, name: 'Amber' },
  { hue: 46,  sat: 88, name: 'Saffron' },
  { hue: 62,  sat: 70, name: 'Citron' },
  { hue: 84,  sat: 58, name: 'Lime' },
  { hue: 110, sat: 50, name: 'Fern' },
  { hue: 152, sat: 56, name: 'Mint' },
  { hue: 174, sat: 52, name: 'Teal' },
  { hue: 196, sat: 66, name: 'Sky' },
  { hue: 210, sat: 72, name: 'Azure' },
  { hue: 224, sat: 72, name: 'Cornflower' },
  { hue: 244, sat: 64, name: 'Indigo' },
  { hue: 266, sat: 60, name: 'Lavender' },
  { hue: 296, sat: 52, name: 'Orchid' },
  { hue: 330, sat: 64, name: 'Hibiscus' },
]

const VISIBLE = 9
const S_MIN = 18, S_MAX = 100
const L_MIN = 26, L_MAX = 82
const DEFAULT_LIGHT = 58

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToHsl(hex) {
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

function closestIdx(hue) {
  let best = 0, bestDist = Infinity
  BASE_COLORS.forEach((bc, i) => {
    const d = Math.min(Math.abs(bc.hue - hue), 360 - Math.abs(bc.hue - hue))
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

// Lightness 26–82 ↔ knob angle -150–150
const lightToAngle = l => ((l - L_MIN) / (L_MAX - L_MIN)) * 300 - 150
const angleToLight = a => Math.round(((a + 150) / 300) * (L_MAX - L_MIN) + L_MIN)

// One period of a squiggle, as a repeating background tile.
function waveUrl(stroke) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>` +
    `<path d='M0 12 q 6 -7 12 0 t 12 0' stroke='${stroke}' stroke-width='3' stroke-linecap='round'/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
const WAVE_LIGHT = waveUrl('#d6cdd2')
const WAVE_DARK = waveUrl('#8f8790')
const WAVE_LIGHT_D = waveUrl('rgba(255,255,255,0.18)')
const WAVE_DARK_D = waveUrl('rgba(255,255,255,0.5)')

export default function MemberForm({ initial = {}, onSave, onCancel, dark = false }) {
  const c = theme(dark)

  const [name, setName] = useState(initial.name || '')
  const [loading, setLoading] = useState(false)

  const parsed = parseColor(initial.color)
  const init = initial.color ? hexToHsl(parsed.c) : { h: BASE_COLORS[0].hue, s: BASE_COLORS[0].sat, l: DEFAULT_LIGHT }
  const [hue, setHue] = useState(init.h)
  const [sat, setSat] = useState(clamp(init.s, S_MIN, S_MAX))
  const [light, setLight] = useState(clamp(init.l, L_MIN, L_MAX))
  // Keep the saved value byte-for-byte until the user actually edits something.
  const [touched, setTouched] = useState(false)

  const hueIdx = closestIdx(hue)
  const base = BASE_COLORS[hueIdx]
  const solid = hslToHex(hue, sat, light)
  const savedValue = touched || !initial.color ? solid : initial.color

  const MAX_START = Math.max(0, BASE_COLORS.length - VISIBLE)
  const pageStartFor = idx => Math.min(MAX_START, Math.floor(idx / VISIBLE) * VISIBLE)
  const [carouselStart, setCarouselStart] = useState(pageStartFor(hueIdx))

  function selectHue(idx) {
    const bc = BASE_COLORS[idx]
    setHue(bc.hue)
    setSat(clamp(bc.sat, S_MIN, S_MAX))
    setTouched(true)
    setCarouselStart(pageStartFor(idx))
  }

  function setSatPct(v) { setTouched(true); setSat(clamp(v, S_MIN, S_MAX)) }

  // ── Canvas blob → saturation (x) + lightness (y), synced with the slider/knob ──
  const canvasRef = useRef(null)
  const canvasDrag = useRef(false)
  function applyCanvas(e) {
    const r = canvasRef.current.getBoundingClientRect()
    const x = clamp((e.clientX - r.left) / r.width, 0, 1)
    const y = clamp((e.clientY - r.top) / r.height, 0, 1)
    setTouched(true)
    setSat(Math.round(S_MIN + x * (S_MAX - S_MIN)))
    setLight(Math.round(L_MIN + (1 - y) * (L_MAX - L_MIN)))
  }
  function canvasDown(e) {
    e.preventDefault()
    canvasDrag.current = true
    canvasRef.current.setPointerCapture(e.pointerId)
    applyCanvas(e)
  }
  function canvasMove(e) { if (canvasDrag.current) applyCanvas(e) }
  function canvasUp() { canvasDrag.current = false }

  const blobX = clamp((sat - S_MIN) / (S_MAX - S_MIN), 0.08, 0.92)
  const blobY = clamp(1 - (light - L_MIN) / (L_MAX - L_MIN), 0.1, 0.9)

  // ── Rotary knob → lightness (shade) ──
  const knobRef = useRef(null)
  const knobDrag = useRef(false)
  const lastAngle = useRef(0)
  function pointerAngle(e, rect) {
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
  }
  function knobDown(e) {
    e.preventDefault(); e.stopPropagation()
    knobDrag.current = true
    lastAngle.current = pointerAngle(e, knobRef.current.getBoundingClientRect())
    knobRef.current.setPointerCapture(e.pointerId)
  }
  function knobMove(e) {
    if (!knobDrag.current) return
    const a = pointerAngle(e, knobRef.current.getBoundingClientRect())
    const delta = a - lastAngle.current
    lastAngle.current = a
    setTouched(true)
    setLight(prev => angleToLight(clamp(lightToAngle(prev) + delta, -150, 150)))
  }
  function knobUp() { knobDrag.current = false }
  function bumpLight(d) { setTouched(true); setLight(l => clamp(l + d, L_MIN, L_MAX)) }

  function shuffle() {
    const bc = BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)]
    setHue(bc.hue)
    setSat(clamp(40 + Math.round(Math.random() * 55), S_MIN, S_MAX))
    setLight(clamp(44 + Math.round(Math.random() * 26), L_MIN, L_MAX))
    setTouched(true)
    setCarouselStart(pageStartFor(closestIdx(bc.hue)))
  }

  const cardBg = `hsl(${hue}, 22%, ${dark ? 16 : 93}%)`
  const dotColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const panelBg = dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.5)'

  const visibleColors = BASE_COLORS.slice(carouselStart, carouselStart + VISIBLE)
  const canPrev = carouselStart > 0
  const canNext = carouselStart < MAX_START

  const inputBase = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    color: c.text,
    fontFamily: 'inherit',
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    const payload = { name: name.trim(), color: savedValue, pattern: 'solid', pin: initial.pin || '0000' }
    const result = initial.id
      ? await supabase.from('members').update(payload).eq('id', initial.id).select().single()
      : await supabase.from('members').insert(payload).select().single()
    setLoading(false)
    if (result.error) { console.error(result.error); return }
    onSave(result.data)
  }

  const TICKS = 14
  const knobAngle = lightToAngle(light)
  const sunActive = light >= 60
  const moonActive = light <= 42
  const satPct = (sat - S_MIN) / (S_MAX - S_MIN)

  const waveTrack = img => ({
    backgroundImage: img,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'left center',
    backgroundSize: '24px 24px',
  })

  return (
    <div className="space-y-4">

      {/* ── Preview card ── */}
      <div style={{
        backgroundColor: cardBg,
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.3px, transparent 1.3px)`,
        backgroundSize: '13px 13px',
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'background-color 0.4s ease',
      }}>
        {/* Drag surface — blob position = vividness (x) + shade (y) */}
        <div
          ref={canvasRef}
          onPointerDown={canvasDown}
          onPointerMove={canvasMove}
          onPointerUp={canvasUp}
          style={{ position: 'relative', height: 168, touchAction: 'none', cursor: 'crosshair' }}
        >
          <div onPointerDown={e => e.stopPropagation()}
            style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex',
              justifyContent: 'center', gap: 6, zIndex: 2 }}>
            <IconBtn title="Shuffle" onClick={shuffle} dark={dark}><Sparkles size={15} /></IconBtn>
            <IconBtn title="Brighter" onClick={() => { setLight(72); setTouched(true) }} active={sunActive} dark={dark}><Sun size={15} /></IconBtn>
            <IconBtn title="Deeper" onClick={() => { setLight(36); setTouched(true) }} active={moonActive} dark={dark}><Moon size={15} /></IconBtn>
          </div>

          <div style={{
            position: 'absolute',
            left: `${blobX * 100}%`, top: `${blobY * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 80, height: 80, borderRadius: '50%',
            backgroundColor: solid,
            border: '4px solid rgba(255,255,255,0.9)',
            boxShadow: `0 10px 30px ${solid}66, 0 1px 2px rgba(0,0,0,0.15)`,
            transition: canvasDrag.current ? 'none' : 'left 0.15s, top 0.15s, background-color 0.25s ease',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Swatch carousel (hue) */}
        <div style={{ background: panelBg, padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => setCarouselStart(s => Math.max(0, s - VISIBLE))} disabled={!canPrev}
              style={{ opacity: canPrev ? 0.6 : 0.15, background: 'none', border: 'none', fontSize: 20,
                color: dark ? '#fff' : '#000', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>‹</button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
              {visibleColors.map(bc => {
                const gi = BASE_COLORS.indexOf(bc)
                const sw = hslToHex(bc.hue, bc.sat, DEFAULT_LIGHT)
                const sel = gi === hueIdx
                return (
                  <button key={bc.hue} type="button" onClick={() => selectHue(gi)} title={bc.name}
                    style={{
                      width: sel ? 30 : 24, height: sel ? 30 : 24, borderRadius: '50%', backgroundColor: sw,
                      border: `3px solid ${sel ? 'rgba(255,255,255,0.9)' : 'transparent'}`,
                      boxShadow: sel ? `0 0 0 2px ${sw}, 0 4px 12px ${sw}70` : '0 2px 5px rgba(0,0,0,0.22)',
                      transition: 'all 0.24s cubic-bezier(0.34,1.56,0.64,1)', cursor: 'pointer', flexShrink: 0,
                    }} />
                )
              })}
            </div>
            <button type="button" onClick={() => setCarouselStart(s => Math.min(MAX_START, s + VISIBLE))} disabled={!canNext}
              style={{ opacity: canNext ? 0.6 : 0.15, background: 'none', border: 'none', fontSize: 20,
                color: dark ? '#fff' : '#000', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>›</button>
          </div>
        </div>

        {/* Colour name */}
        <div style={{ background: panelBg, textAlign: 'center', paddingBottom: 6, marginTop: -2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: solid, transition: 'color 0.3s ease' }}>{base.name}</span>
        </div>

        {/* Vividness squiggle + shade knob */}
        <div style={{ background: dark ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.3)',
          padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Squiggle = saturation (vividness) */}
          <div style={{ flex: 1, position: 'relative', height: 50 }} title="Vividness">
            <div style={{ position: 'absolute', left: 0, right: 0, top: 13, height: 24, ...waveTrack(dark ? WAVE_LIGHT_D : WAVE_LIGHT) }} />
            <div style={{ position: 'absolute', left: 0, top: 13, height: 24, width: `${satPct * 100}%`, overflow: 'hidden', ...waveTrack(dark ? WAVE_DARK_D : WAVE_DARK) }} />
            <input type="range" min={S_MIN} max={S_MAX} value={sat}
              onChange={e => setSatPct(Number(e.target.value))}
              aria-label="Vividness" className="grain-slider" />
          </div>

          {/* Rotary knob = lightness (shade) */}
          <div
            ref={knobRef}
            role="slider" tabIndex={0} aria-label="Shade"
            aria-valuemin={L_MIN} aria-valuemax={L_MAX} aria-valuenow={Math.round(light)}
            onPointerDown={knobDown} onPointerMove={knobMove} onPointerUp={knobUp}
            onWheel={e => bumpLight(e.deltaY < 0 ? 3 : -3)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); bumpLight(3) }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); bumpLight(-3) }
            }}
            style={{ position: 'relative', width: 46, height: 46, flexShrink: 0,
              cursor: knobDrag.current ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none' }}
          >
            {Array.from({ length: TICKS }).map((_, i) => {
              const a = (i / TICKS) * 300 - 150
              const rad = (a - 90) * Math.PI / 180
              const active = a <= knobAngle
              return (
                <div key={i} style={{
                  position: 'absolute', width: active ? 4 : 3, height: active ? 4 : 3, borderRadius: '50%',
                  background: active ? solid : (dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'),
                  top: '50%', left: '50%',
                  transform: `translate(${Math.cos(rad) * 21}px, ${Math.sin(rad) * 21}px) translate(-50%,-50%)`,
                  transition: 'background 0.2s, width 0.2s, height 0.2s',
                }} />
              )
            })}
            <div style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              background: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.6)',
            }}>
              <div style={{
                position: 'absolute', width: 6, height: 6, borderRadius: '50%', backgroundColor: solid,
                top: '50%', left: '50%', transformOrigin: '0 0',
                transform: `rotate(${knobAngle}deg) translateX(10px) translateY(-3px)`,
                boxShadow: `0 0 5px ${solid}`,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Name input */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, marginBottom: 6,
          color: c.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Name
        </label>
        <input
          type="text" value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-2 text-sm outline-none transition-all"
          style={inputBase}
          onFocus={e => e.target.style.borderColor = solid}
          onBlur={e => e.target.style.borderColor = c.inputBorder}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 text-xs font-medium transition-colors"
          style={{ border: `1px solid ${c.borderLight}`, color: c.muted, background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >Cancel</button>
        <button type="button" onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ background: c.text, color: c.bg }}
        >
          {loading ? 'Saving…' : initial.id ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}

function IconBtn({ children, onClick, title, active, dark }) {
  const [hov, setHov] = useState(false)
  const on = active || hov
  return (
    <button type="button" onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
        color: dark ? (on ? '#fff' : 'rgba(255,255,255,0.5)') : (on ? '#222' : 'rgba(0,0,0,0.42)'),
        background: active ? (dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)') : 'transparent',
        transition: 'color 0.15s, background 0.15s',
      }}>
      {children}
    </button>
  )
}
