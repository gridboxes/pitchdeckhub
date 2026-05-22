function joinClasses(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function Input({ className = '', ...props }) {
  return <input className={joinClasses('app-input', className)} {...props} />
}
