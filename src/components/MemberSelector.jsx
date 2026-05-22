import { useState, useRef, useEffect } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import { theme } from '../lib/theme'
import MemberCircle from './MemberCircle'
import MemberForm from './MemberForm'

export default function MemberSelector({ members, selected, onChange, onMembersChange, dark = false }) {
  const c = theme(dark)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function toggleMember(member) {
    const already = selected.find(m => m.id === member.id)
    if (already) onChange(selected.filter(m => m.id !== member.id))
    else if (selected.length < 2) onChange([...selected, member])
  }

  function handleNewMember(newMember) {
    onMembersChange([...members, newMember])
    if (selected.length < 2) onChange([...selected, newMember])
    setCreating(false)
    setOpen(false)
  }

  const unselected = members.filter(m => !selected.find(s => s.id === m.id))

  return (
    <div className="space-y-2" ref={ref}>
      {/* Selected tags + add button */}
      <div className="flex gap-2 flex-wrap min-h-[30px]">
        {selected.map(m => (
          <span key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
            <MemberCircle color={m.color} pattern={m.pattern} size={15} />
            <span className="font-medium" style={{ color: c.text }}>{m.name}</span>
            <button type="button" onClick={() => onChange(selected.filter(m2 => m2.id !== m.id))} style={{ color: c.faint }} className="transition-colors hover:text-red-500 ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
        {selected.length < 2 && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
            style={{ border: `1px solid ${open ? c.accent : c.border}`, color: open ? c.text : c.muted, background: 'transparent' }}
          >
            <Plus size={10} />
            Add member
            <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}`, background: c.bg, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {creating ? (
            <div className="p-4">
              <p className="text-xs font-medium mb-3" style={{ color: c.muted }}>New profile</p>
              <MemberForm dark={dark} onSave={handleNewMember} onCancel={() => setCreating(false)} />
            </div>
          ) : (
            <>
              {unselected.length > 0 ? (
                <ul className="py-1">
                  {unselected.map(m => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => { toggleMember(m); setOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                        style={{ color: c.text }}
                        onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <MemberCircle color={m.color} pattern={m.pattern} size={18} />
                        <span className="font-medium">{m.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2.5 text-xs" style={{ color: c.muted }}>No other members</p>
              )}
              <div style={{ borderTop: `1px solid ${c.border}` }}>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors"
                  style={{ color: c.accent }}
                  onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={12} />
                  Add yourself
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
