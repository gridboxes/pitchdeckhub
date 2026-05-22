export default function MemberCircle({ color, pattern, size = 28 }) {
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 pattern-${pattern}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  )
}
