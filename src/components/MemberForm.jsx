import { useState, useRef, useId } from 'react'
import { Sparkles, Sun, Moon } from 'lucide-react'
import { createMember, updateMember } from '../lib/mockDb'
import { theme } from '../lib/theme'
import { parseColor, serializeColor, gradientCss, hslToHex, hexToHsl, clamp } from '../lib/memberColor'

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

function closestIdx(hue) {
  let best = 0, bestDist = Infinity
  BASE_COLORS.forEach((bc, i) => {
    const d = Math.min(Math.abs(bc.hue - hue), 360 - Math.abs(bc.hue - hue))
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

// A single continuous squiggle path spanning the whole track — one stroke, so
// there are no tile seams/caps to create roughness. `amp` is the wave height:
// 0 → a flat line, larger → taller waves (Arc-style "amplitude = value").
const WAVE_VW = 300, WAVE_P = 40, WAVE_H = 30, WAVE_MID = WAVE_H / 2
function wavePath(amp) {
  const halves = Math.ceil(WAVE_VW / (WAVE_P / 2))
  let d = `M0 ${WAVE_MID} q ${WAVE_P / 4} ${-amp} ${WAVE_P / 2} 0`
  for (let i = 1; i < halves; i++) d += ` t ${WAVE_P / 2} 0`
  return d
}

export default function MemberForm({ initial = {}, onSave, onCancel, dark = false }) {
  const c = theme(dark)

  const [name, setName] = useState(initial.name || '')
  const [loading, setLoading] = useState(false)

  const parsed = parseColor(initial.color)
  const init = initial.color ? hexToHsl(parsed.c) : { h: BASE_COLORS[0].hue, s: BASE_COLORS[0].sat, l: DEFAULT_LIGHT }
  const [hue, setHue] = useState(init.h)
  const [sat, setSat] = useState(clamp(init.s, S_MIN, S_MAX))
  const [light, setLight] = useState(clamp(init.l, L_MIN, L_MAX))
  const [grad, setGrad] = useState(initial.color ? parsed.grad : 0)
  const [ang, setAng] = useState(initial.color ? parsed.ang : 135)
  // Spread knob = hue spread for the gradient's 2nd colour (duotone).
  const [ang3, setAng3] = useState(initial.color ? parsed.sp : 0)
  // Keep the saved value byte-for-byte until the user actually edits something.
  const [touched, setTouched] = useState(false)

  const hueIdx = closestIdx(hue)
  const base = BASE_COLORS[hueIdx]
  const solid = hslToHex(hue, sat, light)
  const sp = Math.round(((ang3 % 360) + 360) % 360)
  const orb = { c: solid, grad, ang, sp }
  const previewBg = gradientCss(orb)
  const savedValue = touched || !initial.color ? serializeColor(orb) : initial.color

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

  function setGradPct(v) { setTouched(true); setGrad(clamp(v / 100, 0, 1)) }

  // ── Canvas blob → saturation (x) + lightness (y) ──
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

  function setSpread(updater) { setTouched(true); setAng3(updater) }

  function shuffle() {
    const bc = BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)]
    setHue(bc.hue)
    setSat(clamp(40 + Math.round(Math.random() * 55), S_MIN, S_MAX))
    setLight(clamp(44 + Math.round(Math.random() * 26), L_MIN, L_MAX))
    setGrad(+Math.random().toFixed(2) * 0.8)
    setAng(Math.round(Math.random() * 360))
    setTouched(true)
    setCarouselStart(pageStartFor(closestIdx(bc.hue)))
  }

  // Mostly-neutral warm card with just a whisper of the hue (Arc keeps it calm).
  const cardBg = `hsl(${hue}, 12%, ${dark ? 15 : 94}%)`
  const dotColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const panelBg = dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.55)'
  const vignette = dark
    ? 'radial-gradient(115% 80% at 50% 34%, rgba(255,255,255,0.06), rgba(255,255,255,0) 66%)'
    : 'radial-gradient(115% 80% at 50% 34%, rgba(255,255,255,0.6), rgba(255,255,255,0) 66%)'
  const sliderPanelBg = dark
    ? 'rgba(0,0,0,0.1)'
    : 'linear-gradient(rgba(255,255,255,0.4), rgba(255,253,251,0.82))'

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
      ? await updateMember(initial.id, payload)
      : await createMember(payload)
    setLoading(false)
    if (result.error) { console.error(result.error); return }
    onSave(result.data)
  }

  const sunActive = light >= 60
  const moonActive = light <= 42
  const gradPct = grad

  // Wave amplitude tracks the gradient amount: flat at 0, tall at max.
  const waveAmp = 20 * grad
  const waveD = wavePath(waveAmp)
  const waveColInactive = dark ? 'rgba(255,255,255,0.20)' : '#cdc5ca'
  const waveColActive = dark ? 'rgba(255,255,255,0.55)' : '#8f8790'
  const waveClipId = 'wave' + useId().replace(/:/g, '')

  return (
    <div className="space-y-4">

      {/* ── Preview card ── */}
      <div style={{
        backgroundColor: cardBg,
        backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'background-color 0.4s ease',
      }}>
        {/* Drag surface — blob position = vividness (x) + shade (y) */}
        <div
          ref={canvasRef}
          onPointerDown={canvasDown}
          onPointerMove={canvasMove}
          onPointerUp={canvasUp}
          style={{ position: 'relative', height: 204, touchAction: 'none', cursor: 'crosshair' }}
        >
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: vignette }} />
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
            width: 62, height: 62, borderRadius: '50%',
            background: previewBg,
            border: '3px solid rgba(255,255,255,0.95)',
            boxShadow: `0 8px 22px ${solid}59, 0 1px 2px rgba(0,0,0,0.12)`,
            transition: canvasDrag.current ? 'none' : 'left 0.15s, top 0.15s, background 0.25s ease',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Swatch carousel (hue) */}
        <div style={{ background: panelBg, padding: '14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ArrowBtn dir="‹" onClick={() => setCarouselStart(s => Math.max(0, s - VISIBLE))} disabled={!canPrev} dark={dark} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {visibleColors.map(bc => {
                const gi = BASE_COLORS.indexOf(bc)
                const sw = hslToHex(bc.hue, bc.sat, DEFAULT_LIGHT)
                const sel = gi === hueIdx
                return (
                  <button key={bc.hue} type="button" onClick={() => selectHue(gi)} title={bc.name}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', backgroundColor: sw, border: 'none',
                      boxShadow: sel
                        ? `0 0 0 2px ${dark ? '#2a2a2a' : '#fff'}, 0 0 0 3px ${sw}, 0 2px 6px rgba(0,0,0,0.18)`
                        : '0 1px 3px rgba(0,0,0,0.16)',
                      transform: sel ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s',
                      cursor: 'pointer', flexShrink: 0,
                    }} />
                )
              })}
            </div>
            <ArrowBtn dir="›" onClick={() => setCarouselStart(s => Math.min(MAX_START, s + VISIBLE))} disabled={!canNext} dark={dark} />
          </div>
        </div>

        {/* Gradient amount squiggle + direction knob */}
        <div style={{ background: sliderPanelBg,
          padding: '14px 14px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>

          {/* Squiggle = gradient amount */}
          <div style={{ flex: 1, position: 'relative', height: 50 }} title="Gradient">
            <svg width="100%" height={WAVE_H} viewBox={`0 0 ${WAVE_VW} ${WAVE_H}`} preserveAspectRatio="none"
              style={{ position: 'absolute', left: 0, top: 10, display: 'block', overflow: 'visible' }}>
              <defs>
                <clipPath id={waveClipId}><rect x="0" y="0" width={gradPct * WAVE_VW} height={WAVE_H} /></clipPath>
              </defs>
              <path d={waveD} fill="none" stroke={waveColInactive} strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={waveD} fill="none" stroke={waveColActive} strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#${waveClipId})`} />
            </svg>
            <input type="range" min={0} max={100} value={Math.round(grad * 100)}
              onChange={e => setGradPct(Number(e.target.value))}
              aria-label="Gradient amount" className="grain-slider" />
          </div>

          {/* Knob 1 = gradient direction — body filled with the live gradient */}
          <Knob angle={ang} dim={grad <= 0.01} dark={dark} ariaLabel="Gradient direction" variant="dot"
            bodyBg={gradientCss({ c: solid, grad: Math.max(grad, 0.25), ang, sp })}
            onChange={u => { setTouched(true); setAng(u) }} />

          {/* Knob 3 = duotone hue-spread — body shows the two-tone result */}
          <Knob angle={ang3} dim={grad <= 0.01} dark={dark} ariaLabel="Hue spread" variant="slotted"
            bodyBg={gradientCss({ c: solid, grad: Math.max(grad, 0.25), ang: 90, sp })}
            onChange={setSpread} />

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

function Knob({ angle, onChange, dark, dim, ariaLabel, variant = 'dot', bodyBg, steps }) {
  const ref = useRef(null)
  const drag = useRef(false)
  const last = useRef(0)
  const TICKS = 18
  const step = steps ? 360 / steps : 0
  const snap = v => steps ? (Math.round(v / step) * step) % 360 : v
  function pAngle(e) {
    const r = ref.current.getBoundingClientRect()
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI
  }
  function down(e) {
    e.preventDefault(); e.stopPropagation()
    drag.current = true
    last.current = pAngle(e)
    ref.current.setPointerCapture(e.pointerId)
  }
  function move(e) {
    if (!drag.current) return
    const a = pAngle(e)
    let delta = a - last.current
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    last.current = a
    onChange(p => snap(((p + delta) % 360 + 360) % 360))
  }
  function up() { drag.current = false }
  function bump(d) { onChange(p => snap(((p + (steps ? Math.sign(d) * step : d)) % 360 + 360) % 360)) }
  // Indicator colour: white (with a shadow) over a filled body, else the muted accent.
  const indCol = bodyBg ? '#fff' : (dark ? '#d4d4d4' : '#827d76')
  const indShadow = bodyBg ? '0 0 3px rgba(0,0,0,0.45)' : 'none'
  return (
    <div
      ref={ref}
      role="slider" tabIndex={0} aria-label={ariaLabel}
      aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(angle)}
      onPointerDown={down} onPointerMove={move} onPointerUp={up}
      onWheel={e => bump(e.deltaY < 0 ? 6 : -6)}
      onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); bump(6) }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); bump(-6) }
      }}
      style={{ position: 'relative', width: 52, height: 52, flexShrink: 0,
        cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none',
        opacity: dim ? 0.45 : 1, transition: 'opacity 0.2s' }}
    >
      {/* Ring: dots / dashes / filling segments */}
      {(variant === 'dot' || variant === 'line' || variant === 'segmented') && Array.from({ length: TICKS }).map((_, i) => {
        const a = (i / TICKS) * 360
        if (variant === 'line') {
          return <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%', width: 1.5, height: 5, borderRadius: 1,
            background: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
            transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-23px)`,
          }} />
        }
        const rad = (a - 90) * Math.PI / 180
        const on = variant === 'segmented' && a <= angle
        return <div key={i} style={{
          position: 'absolute', width: on ? 4 : 3, height: on ? 4 : 3, borderRadius: '50%',
          background: on ? (dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.5)') : (dark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.16)'),
          top: '50%', left: '50%',
          transform: `translate(${Math.cos(rad) * 24}px, ${Math.sin(rad) * 24}px) translate(-50%,-50%)`,
        }} />
      })}

      {/* Ring: gauge arc */}
      {variant === 'gauge' && (
        <svg width="52" height="52" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="26" cy="26" r="23" fill="none" stroke={dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'} strokeWidth="3" />
          <circle cx="26" cy="26" r="23" fill="none" stroke={dark ? '#d4d4d4' : '#827d76'} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(angle / 360) * 2 * Math.PI * 23} ${2 * Math.PI * 23}`} transform="rotate(-90 26 26)" />
        </svg>
      )}

      {/* Body */}
      <div style={{
        position: 'absolute', inset: 9, borderRadius: '50%',
        background: bodyBg || (variant === 'fluted'
          ? `repeating-conic-gradient(${dark ? '#3f3f3f' : '#dedad5'} 0deg 11deg, ${dark ? '#585858' : '#f4f1ed'} 11deg 22deg)`
          : (variant === 'line' || variant === 'slotted'
              ? (dark ? 'radial-gradient(circle at 40% 32%, #3a3a3a, #1c1c1c)' : 'radial-gradient(circle at 40% 32%, #fbfaf9, #e2ded9)')
              : (dark ? 'radial-gradient(circle at 38% 28%, #565656, #2d2d2d)' : 'radial-gradient(circle at 38% 28%, #f0ede9, #cdc9c4)'))),
        boxShadow: '0 3px 9px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.6)',
      }}>
        {(variant === 'dot' || variant === 'fluted') && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 7, height: 11, borderRadius: 4, background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-13px)` }} />
        )}
        {(variant === 'line' || variant === 'segmented') && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 2.5, height: 12, borderRadius: 2, background: indCol, boxShadow: indShadow,
            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-7px)` }} />
        )}
        {variant === 'gauge' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, borderRadius: '50%', background: indCol, boxShadow: indShadow,
            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-11px)` }} />
        )}
        {variant === 'slotted' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 30, borderRadius: 2, background: indCol, boxShadow: indShadow,
            transform: `translate(-50%, -50%) rotate(${angle}deg)` }} />
        )}
      </div>
    </div>
  )
}

// Knob supports 6 visual variants: 'dot' | 'line' | 'gauge' | 'fluted' | 'segmented' | 'slotted'
// (all kept available for future use — swap via the `variant` prop).
function ArrowBtn({ dir, onClick, disabled, dark }) {
  const [hov, setHov] = useState(false)
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        border: 'none', fontSize: 16, lineHeight: 1,
        color: dark ? '#fff' : '#000',
        opacity: disabled ? 0.18 : 0.7,
        background: !disabled && hov ? (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.15s, opacity 0.15s',
      }}>
      {dir}
    </button>
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
