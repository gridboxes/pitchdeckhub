import { theme } from '../lib/theme'
import MemberCircle from './MemberCircle'

export default function MemberTag({ member, dark }) {
  if (!member) return null
  const c = theme(dark)
  return (
    <span className="flex items-center gap-1.5">
      <MemberCircle color={member.color} pattern={member.pattern} size={16} />
      <span className="text-xs font-medium" style={{ color: c.muted }}>{member.name}</span>
    </span>
  )
}
