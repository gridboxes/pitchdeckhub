function joinClasses(...parts) {
  return parts.filter(Boolean).join(' ')
}

const variants = {
  primary: 'app-btn app-btn-primary',
  secondary: 'app-btn app-btn-secondary',
  danger: 'app-btn app-btn-danger',
}

export default function Button({
  as: Component = 'button',
  className = '',
  variant = 'primary',
  children,
  ...props
}) {
  return (
    <Component
      className={joinClasses(variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </Component>
  )
}
