import { useState } from 'react'
import { X, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { theme } from '../lib/theme'
import MemberCircle from './MemberCircle'
import MemberForm from './MemberForm'

export default function ManageMembersModal({ members, onClose, onEdit, onDelete, onCreated, dark = false }) {
  const c = theme(dark)
  const [creating, setCreating] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden" style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ height: 3, background: c.accent, flexShrink: 0 }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${c.borderLight}`, flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            {creating && (
              <button
                onClick={() => setCreating(false)}
                className="p-0.5 -ml-0.5 transition-colors"
                style={{ color: c.faint }}
                onMouseEnter={e => e.currentTarget.style.color = c.text}
                onMouseLeave={e => e.currentTarget.style.color = c.faint}
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: c.text }}>
              {creating ? 'New profile' : 'Members'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: c.faint }}
            onMouseEnter={e => e.currentTarget.style.color = c.text}
            onMouseLeave={e => e.currentTarget.style.color = c.faint}
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {creating ? (
            <MemberForm
              dark={dark}
              onSave={member => { onCreated(member); setCreating(false) }}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <div className="space-y-1">
              {members.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: c.muted }}>No members yet</p>
              ) : (
                members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-2 py-2 -mx-2 group">
                    <MemberCircle color={m.color} pattern={m.pattern} size={28} />
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: c.text }}>{m.name}</span>
                    <RowBtn onClick={() => onEdit(m)} title="Edit" c={c}>
                      <Pencil size={12} />
                    </RowBtn>
                    <RowBtn onClick={() => onDelete(m)} title="Delete" c={c} danger>
                      <Trash2 size={12} />
                    </RowBtn>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-1.5 mt-3 py-2.5 text-xs font-medium transition-colors"
                style={{ border: `1px solid ${c.borderLight}`, color: c.muted }}
                onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={12} />
                New member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RowBtn({ children, onClick, title, c, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 transition-colors"
      style={{ color: hov ? (danger ? '#dc2626' : c.text) : c.faint, background: 'transparent' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}
