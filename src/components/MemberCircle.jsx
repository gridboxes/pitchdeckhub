import { parseColor, grainUrl } from '../lib/memberColor'

export default function MemberCircle({ color, pattern, size = 28 }) {
  const { c, g } = parseColor(color)
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 pattern-${pattern}`}
      style={{
        width: size,
        height: size,
        backgroundColor: c,
        backgroundImage: grainUrl(g),
        boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.06)',
      }}
    />
  )
}
