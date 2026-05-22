import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ViewSlug() {
  const { slug } = useParams()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function redirect() {
      const { data, error } = await supabase
        .from('decks')
        .select('deck_url')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setNotFound(true)
        return
      }

      window.location.replace(data.deck_url)
    }

    redirect()
  }, [slug])

  if (!notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <span className="text-5xl font-bold" style={{ color: 'var(--text-faint)' }}>404</span>
      <p className="font-medium" style={{ color: 'var(--text)' }}>Deck not found</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        The link <code className="font-mono">/view/{slug}</code> doesn't exist.
      </p>
    </div>
  )
}
