import { X } from 'lucide-react'
import { theme } from '../lib/theme'
import MemberForm from './MemberForm'

export default function EditMemberModal({ member, onClose, onSaved, dark = false }) {
  const c = theme(dark)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden" style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        <div style={{ height: 3, background: c.accent }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${c.borderLight}` }}>
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: c.text }}>Edit profile</h2>
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
        <div className="px-6 py-5">
          <MemberForm dark={dark} initial={member} requirePin onSave={updated => { onSaved(updated); onClose() }} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
