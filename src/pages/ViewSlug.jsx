import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDeckBySlug } from '../lib/mockDb'
import { useTheme } from '../context/ThemeContext'
import { theme } from '../lib/theme'

export default function ViewSlug() {
  const { slug } = useParams()
  const { dark } = useTheme()
  const c = theme(dark)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function redirect() {
      const deck = await getDeckBySlug(slug)

      if (!deck) {
        setNotFound(true)
        return
      }

      window.location.replace(deck.deck_url)
    }

    redirect()
  }, [slug])

  if (!notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: c.bg }}>
        <p className="text-sm" style={{ color: c.muted }}>Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" style={{ background: c.bg }}>
      <span className="text-5xl font-bold" style={{ color: c.faint }}>404</span>
      <p className="font-medium" style={{ color: c.text }}>Deck not found</p>
      <p className="text-sm" style={{ color: c.muted }}>
        The link <code className="font-mono">/view/{slug}</code> doesn't exist.
      </p>
    </div>
  )
}
