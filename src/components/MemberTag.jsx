import { theme } from '../lib/theme'
import MemberCircle from './MemberCircle'

export default function MemberTag({ member, dark, onClick }) {
  if (!member) return null
  const c = theme(dark)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
      title="Click to edit profile"
    >
      <MemberCircle color={member.color} pattern={member.pattern} size={20} />
      <span className="text-xs font-medium" style={{ color: c.muted }}>{member.name}</span>
    </button>
  )
}
