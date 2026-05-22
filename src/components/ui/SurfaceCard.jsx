function joinClasses(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function SurfaceCard({ className = '', hover = false, children, ...props }) {
  return (
    <div
      className={joinClasses('app-card rounded-[24px]', hover && 'app-card-hover', className)}
      {...props}
    >
      {children}
    </div>
  )
}
