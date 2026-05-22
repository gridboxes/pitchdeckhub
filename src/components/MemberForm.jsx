import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'
import MemberCircle from './MemberCircle'

const COLORS = ['#F6C347', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F0A500', '#A8E6CF']
const PATTERNS = ['solid', 'dots', 'stripes', 'grid']

export default function MemberForm({ initial = {}, onSave, onCancel, requirePin = false, dark = false }) {
  const c = theme(dark)

  const [name, setName] = useState(initial.name || '')
  const [color, setColor] = useState(initial.color || COLORS[0])
  const [pattern, setPattern] = useState(initial.pattern || 'solid')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pinChecked, setPinChecked] = useState(!requirePin)

  function handlePinCheck() {
    pin === initial.pin ? setPinChecked(true) : setPinError('Incorrect PIN')
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    const payload = { name: name.trim(), color, pattern, pin: pin || initial.pin || '0000' }
    const result = initial.id
      ? await supabase.from('members').update(payload).eq('id', initial.id).select().single()
      : await supabase.from('members').insert(payload).select().single()
    setLoading(false)
    if (result.error) { console.error(result.error); return }
    onSave(result.data)
  }

  const inputStyle = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    color: c.text,
    fontFamily: 'inherit',
  }

  // PIN gate
  if (!pinChecked) {
    return (
      <div className="space-y-3">
        <p className="text-xs" style={{ color: c.muted }}>Enter your 4-digit PIN to edit your profile.</p>
        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError('') }}
          placeholder="• • • •"
          className="w-full px-3 py-2 rounded-lg text-sm text-center tracking-widest outline-none transition-all"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = c.accent}
          onBlur={e => e.target.style.borderColor = c.inputBorder}
        />
        {pinError && <p className="text-xs" style={{ color: '#dc2626' }}>{pinError}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ border: `1px solid ${c.border}`, color: c.muted }}>Cancel</button>
          <button type="button" onClick={handlePinCheck} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: c.accent, color: c.accentFg }}>Confirm</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Avatar preview */}
      <div className="flex justify-center py-1">
        <MemberCircle color={color} pattern={pattern} size={48} />
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: c.muted }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = c.accent}
          onBlur={e => e.target.style.borderColor = c.inputBorder}
        />
      </div>

      {/* PIN (new members only) */}
      {!initial.id && (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: c.muted }}>4-digit PIN</label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="• • • •"
            className="w-full px-3 py-2 rounded-lg text-sm text-center tracking-widest outline-none transition-all"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = c.accent}
            onBlur={e => e.target.style.borderColor = c.inputBorder}
          />
        </div>
      )}

      {/* Color */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: c.muted }}>Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(col => (
            <button
              key={col}
              type="button"
              onClick={() => setColor(col)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: col, boxShadow: color === col ? `0 0 0 2px ${c.bg}, 0 0 0 4px ${col}` : 'none' }}
            />
          ))}
        </div>
      </div>

      {/* Pattern */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: c.muted }}>Pattern</label>
        <div className="flex gap-2">
          {PATTERNS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPattern(p)}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs flex-1 transition-colors"
              style={{
                border: `1px solid ${pattern === p ? c.accent : c.border}`,
                background: pattern === p ? 'rgba(246,195,71,0.08)' : 'transparent',
                color: pattern === p ? c.text : c.muted,
              }}
            >
              <span className={`w-5 h-5 rounded-full pattern-${p}`} style={{ backgroundColor: color }} />
              <span className="capitalize">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ border: `1px solid ${c.border}`, color: c.muted }}>Cancel</button>
        <button type="button" onClick={handleSave} disabled={loading} className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: c.accent, color: c.accentFg }}>
          {loading ? 'Saving…' : initial.id ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}
