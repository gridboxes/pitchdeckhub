import { Trash2 } from 'lucide-react'
import { theme } from '../lib/theme'

export default function DeleteDialog({ deckName, onConfirm, onCancel, loading, dark }) {
  const c = theme(dark)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onCancel} />
      <div className="relative w-full max-w-sm p-6 text-center" style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        borderTop: '3px solid #dc2626',
      }}>
        <div className="flex items-center justify-center w-9 h-9 mx-auto mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <Trash2 size={16} style={{ color: '#dc2626' }} />
        </div>
        <h3 className="text-sm font-semibold tracking-tight mb-1" style={{ color: c.text }}>Delete deck?</h3>
        <p className="text-xs mb-6" style={{ color: c.muted }}>
          <span className="font-semibold" style={{ color: c.text }}>{deckName}</span> will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-xs font-medium transition-colors"
            style={{ border: `1px solid ${c.borderLight}`, color: c.muted, background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ background: '#dc2626', color: '#fff', border: '1px solid #dc2626' }}
          >{loading ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  )
}
