import IconButton from './IconButton'

export default function ModalShell({ title, onClose, maxWidth = 'max-w-md', children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="app-overlay absolute inset-0" onClick={onClose} />
      <div className={`app-panel-strong relative w-full ${maxWidth} overflow-hidden rounded-[28px]`}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-faint)' }}>Workspace</p>
            <h2 className="mt-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          </div>
          <IconButton onClick={onClose} type="button" aria-label="Close dialog">
            <span className="text-base leading-none">×</span>
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
