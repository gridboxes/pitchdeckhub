function joinClasses(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function IconButton({ className = '', children, ...props }) {
  return (
    <button className={joinClasses('app-icon-btn', className)} {...props}>
      {children}
    </button>
  )
}
