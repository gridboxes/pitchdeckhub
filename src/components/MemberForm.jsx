import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'

const BASE_COLORS = [
  { hue: 350, sat: 68, name: 'Rosé' },
  { hue: 12,  sat: 78, name: 'Coral' },
  { hue: 28,  sat: 82, name: 'Tangerine' },
  { hue: 45,  sat: 88, name: 'Saffron' },
  { hue: 80,  sat: 58, name: 'Lime' },
  { hue: 152, sat: 58, name: 'Mint' },
  { hue: 178, sat: 52, name: 'Teal' },
  { hue: 200, sat: 68, name: 'Sky' },
  { hue: 225, sat: 72, name: 'Cornflower' },
  { hue: 265, sat: 62, name: 'Lavender' },
  { hue: 295, sat: 52, name: 'Orchid' },
  { hue: 338, sat: 68, name: 'Hibiscus' },
]

const VISIBLE = 9

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

function hexToHue(hex) {
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

function findClosest(hex) {
  const { h, s, l } = hexToHue(hex)
  let best = 0, bestDist = Infinity
  BASE_COLORS.forEach((bc, i) => {
    const d = Math.min(Math.abs(bc.hue - h), 360 - Math.abs(bc.hue - h))
    if (d < bestDist) { bestDist = d; best = i }
  })
  return { idx: best, lightness: Math.max(22, Math.min(80, l)) }
}

// Sat 20–100 ↔ knobAngle -150–150
function satToAngle(sat) { return ((sat - 20) / 80) * 300 - 150 }
function angleToSat(angle) { return Math.round(((angle + 150) / 300) * 80 + 20) }

export default function MemberForm({ initial = {}, onSave, onCancel, dark = false }) {
  const c = theme(dark)

  const [name, setName] = useState(initial.name || '')
  const [loading, setLoading] = useState(false)

  const init = initial.color ? findClosest(initial.color) : { idx: 0, lightness: 60 }
  const [hueIdx, setHueIdx] = useState(init.idx)
  const [lightness, setLightness] = useState(init.lightness)
  const [saturation, setSaturation] = useState(BASE_COLORS[init.idx].sat)
  const [knobAngle, setKnobAngle] = useState(satToAngle(BASE_COLORS[init.idx].sat))
  const [carouselStart, setCarouselStart] = useState(
    Math.max(0, Math.min(BASE_COLORS.length - VISIBLE, init.idx - Math.floor(VISIBLE / 2)))
  )

  const base = BASE_COLORS[hueIdx]
  const color = hslToHex(base.hue, saturation, lightness)

  function selectHue(idx) {
    setHueIdx(idx)
    const bc = BASE_COLORS[idx]
    setSaturation(bc.sat)
    setKnobAngle(satToAngle(bc.sat))
    setCarouselStart(Math.max(0, Math.min(BASE_COLORS.length - VISIBLE, idx - Math.floor(VISIBLE / 2))))
  }

  // Knob drag
  const knobRef = useRef(null)
  const dragging = useRef(false)
  const lastPointerAngle = useRef(0)

  function getPointerAngle(e, rect) {
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
  }

  function onKnobPointerDown(e) {
    e.preventDefault()
    dragging.current = true
    const rect = knobRef.current.getBoundingClientRect()
    lastPointerAngle.current = getPointerAngle(e, rect)
    knobRef.current.setPointerCapture(e.pointerId)
  }

  function onKnobPointerMove(e) {
    if (!dragging.current) return
    const rect = knobRef.current.getBoundingClientRect()
    const angle = getPointerAngle(e, rect)
    const delta = angle - lastPointerAngle.current
    lastPointerAngle.current = angle
    setKnobAngle(prev => {
      const next = Math.max(-150, Math.min(150, prev + delta))
      setSaturation(angleToSat(next))
      return next
    })
  }

  function onKnobPointerUp() { dragging.current = false }

  const cardBg = `hsl(${base.hue}, 22%, ${dark ? 16 : 93}%)`
  const dotColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const panelBg = dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.55)'
  const sliderTrack = `linear-gradient(to right,
    hsl(${base.hue},${saturation}%,18%),
    hsl(${base.hue},${saturation}%,52%),
    hsl(${base.hue},${saturation}%,85%))`

  const visibleColors = BASE_COLORS.slice(carouselStart, carouselStart + VISIBLE)
  const canPrev = carouselStart > 0
  const canNext = carouselStart < BASE_COLORS.length - VISIBLE

  const inputBase = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    color: c.text,
    fontFamily: 'inherit',
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    const payload = { name: name.trim(), color, pattern: 'solid', pin: initial.pin || '0000' }
    const result = initial.id
      ? await supabase.from('members').update(payload).eq('id', initial.id).select().single()
      : await supabase.from('members').insert(payload).select().single()
    setLoading(false)
    if (result.error) { console.error(result.error); return }
    onSave(result.data)
  }

  const TICKS = 14

  return (
    <div className="space-y-5">

      {/* ── Color picker card ── */}
      <div style={{
        background: cardBg,
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.3px, transparent 1.3px)`,
        backgroundSize: '13px 13px',
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'background-color 0.4s ease',
      }}>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 148 }}>
          <div style={{
            width: 78,
            height: 78,
            borderRadius: '50%',
            backgroundColor: color,
            border: '4px solid rgba(255,255,255,0.88)',
            boxShadow: `0 8px 36px ${color}55`,
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
          }} />
        </div>

        {/* Swatches row */}
        <div style={{ background: panelBg, padding: '10px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => setCarouselStart(s => Math.max(0, s - 1))}
              disabled={!canPrev}
              style={{ opacity: canPrev ? 0.65 : 0.15, background: 'none', border: 'none',
                fontSize: 20, color: dark ? '#fff' : '#000', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
            >‹</button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
              {visibleColors.map(bc => {
                const gi = BASE_COLORS.indexOf(bc)
                const sw = hslToHex(bc.hue, bc.sat, 58)
                const sel = gi === hueIdx
                return (
                  <button key={bc.hue} type="button" onClick={() => selectHue(gi)}
                    title={bc.name}
                    style={{
                      width: sel ? 34 : 26, height: sel ? 34 : 26,
                      borderRadius: '50%',
                      backgroundColor: sw,
                      border: `3px solid ${sel ? 'rgba(255,255,255,0.9)' : 'transparent'}`,
                      boxShadow: sel
                        ? `0 0 0 2px ${sw}, 0 4px 14px ${sw}70`
                        : `0 2px 5px rgba(0,0,0,0.22)`,
                      transition: 'all 0.24s cubic-bezier(0.34,1.56,0.64,1)',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>

            <button type="button" onClick={() => setCarouselStart(s => Math.min(BASE_COLORS.length - VISIBLE, s + 1))}
              disabled={!canNext}
              style={{ opacity: canNext ? 0.65 : 0.15, background: 'none', border: 'none',
                fontSize: 20, color: dark ? '#fff' : '#000', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
            >›</button>
          </div>
        </div>

        {/* Slider + Knob */}
        <div style={{ background: dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.32)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Lightness slider */}
          <div style={{ flex: 1, position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 7, borderRadius: 4,
              background: sliderTrack,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.18)',
              transition: 'background 0.3s ease',
            }} />
            <input
              type="range" min={22} max={82} value={lightness}
              onChange={e => setLightness(Number(e.target.value))}
              className="color-slider"
              style={{ position: 'relative', zIndex: 1 }}
            />
          </div>

          {/* Saturation knob */}
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            {/* Tick dots around the ring */}
            {Array.from({ length: TICKS }).map((_, i) => {
              const angle = (i / TICKS) * 300 - 150
              const rad = (angle - 90) * Math.PI / 180
              const active = angle <= knobAngle
              return (
                <div key={i} style={{
                  position: 'absolute',
                  width: active ? 4 : 3, height: active ? 4 : 3,
                  borderRadius: '50%',
                  background: active ? color : (dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'),
                  top: '50%', left: '50%',
                  transform: `translate(${Math.cos(rad) * 24}px, ${Math.sin(rad) * 24}px) translate(-50%,-50%)`,
                  transition: 'background 0.25s ease, width 0.2s, height 0.2s',
                }} />
              )
            })}
            {/* Knob body */}
            <div
              ref={knobRef}
              onPointerDown={onKnobPointerDown}
              onPointerMove={onKnobPointerMove}
              onPointerUp={onKnobPointerUp}
              style={{
                position: 'absolute', inset: 8,
                borderRadius: '50%',
                background: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.82)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.6)',
                cursor: dragging.current ? 'grabbing' : 'grab',
                userSelect: 'none', touchAction: 'none',
              }}
            >
              {/* Indicator dot */}
              <div style={{
                position: 'absolute', width: 5, height: 5, borderRadius: '50%',
                backgroundColor: color,
                top: '50%', left: '50%',
                transformOrigin: '0 0',
                transform: `rotate(${knobAngle}deg) translateX(11px) translateY(-2.5px)`,
                boxShadow: `0 0 5px ${color}`,
                transition: 'background-color 0.3s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Color name */}
      <p style={{
        textAlign: 'center', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color, transition: 'color 0.3s ease', marginTop: -8,
      }}>
        {base.name}
      </p>

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
          onFocus={e => e.target.style.borderColor = color}
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
