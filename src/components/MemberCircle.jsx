import { parseColor, gradientCss } from '../lib/memberColor'

export default function MemberCircle({ color, pattern, size = 28 }) {
  const orb = parseColor(color)
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 pattern-${pattern}`}
      style={{
        width: size,
        height: size,
        background: gradientCss(orb),
        boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.06)',
      }}
    />
  )
}
