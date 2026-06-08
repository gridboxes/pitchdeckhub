import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'
import MemberSelector from './MemberSelector'

export default function DeckModal({ deck, members: initialMembers, dark, onClose, onSaved }) {
  const c = theme(dark)

  const [clientName, setClientName] = useState(deck?.client_name || '')
  const [slug, setSlug] = useState(deck?.slug || '')
  const [slugTouched, setSlugTouched] = useState(!!deck?.slug)
  const [deckUrl, setDeckUrl] = useState(deck?.deck_url || '')
  const [altDeckUrl, setAltDeckUrl] = useState(deck?.alt_deck_url || '')
  const [showAltUrl, setShowAltUrl] = useState(!!deck?.alt_deck_url)

  function autoSlug(name) {
    return name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleTitleChange(e) {
    const name = e.target.value
    setClientName(name)
    if (!slugTouched) setSlug(autoSlug(name))
  }
  const [selected, setSelected] = useState([])
  const [members, setMembers] = useState(initialMembers || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (deck?.member_ids?.length) {
      setSelected(members.filter(m => deck.member_ids.includes(m.id)))
    }
  }, [deck])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const payload = {
      client_name: clientName.trim(),
      slug: slug.trim().toUpperCase(),
      deck_url: deckUrl.trim(),
      alt_deck_url: altDeckUrl.trim() || null,
      member_ids: selected.map(m => m.id),
    }
    const q = `*`
    const result = deck?.id
      ? await supabase.from('decks').update(payload).eq('id', deck.id).select(q).single()
      : await supabase.from('decks').insert(payload).select(q).single()
    setLoading(false)
    if (result.error) {
      const msg = result.error.message || ''
      if (msg.includes('decks_slug_key') || msg.includes('unique') && msg.includes('slug')) {
        setError(`The slug "${payload.slug}" is already taken. Choose a different one.`)
      } else {
        setError(msg)
      }
      return
    }
    onSaved(result.data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="relative w-full max-w-md overflow-y-auto max-h-[90vh]" style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>

        <div style={{ height: 3, background: c.accent }} />

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${c.borderLight}` }}>
          <h2 className="font-display text-base font-bold tracking-tight" style={{ color: c.text }}>
            {deck ? 'Edit deck' : 'Add deck'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: c.faint }}
            onMouseEnter={e => e.currentTarget.style.color = c.text}
            onMouseLeave={e => e.currentTarget.style.color = c.faint}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <Field label="Deck title" c={c}>
            <FocusInput type="text" value={clientName} onChange={handleTitleChange} required placeholder="" c={c} />
          </Field>

          <Field label="Slug" c={c} hint="Uppercase letters, numbers, hyphens, underscores only">
            <SlugInput value={slug} onChange={e => { setSlugTouched(true); setSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')) }} c={c} />
          </Field>

          <Field label="Deck URL" c={c}>
            <FocusInput type="url" value={deckUrl} onChange={e => setDeckUrl(e.target.value)} required placeholder="" c={c} />
          </Field>

          {showAltUrl ? (
            <Field label="Alternative URL" c={c}>
              <FocusInput type="url" value={altDeckUrl} onChange={e => setAltDeckUrl(e.target.value)} placeholder="" c={c} />
            </Field>
          ) : (
            <button
              type="button"
              onClick={() => setShowAltUrl(true)}
              className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-60"
              style={{ color: c.muted }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add alternative URL
            </button>
          )}

          <Field label="Crafted by" c={c}>
            <MemberSelector members={members} selected={selected} onChange={setSelected} onMembersChange={setMembers} dark={dark} />
          </Field>

          {error && (
            <p className="text-xs px-3 py-2" style={{ background: '#fef2f2', color: '#dc2626', borderLeft: '3px solid #dc2626' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{ border: `1px solid ${c.borderLight}`, color: c.muted, background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
              style={{ background: c.text, color: c.bg }}
            >{loading ? 'Saving…' : deck ? 'Save changes' : 'Add deck'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, c, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 uppercase" style={{ color: c.muted, letterSpacing: '0.06em' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: c.faint }}>{hint}</p>}
    </div>
  )
}

function FocusInput({ c, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm outline-none transition-all"
      style={{
        background: c.inputBg,
        border: `1px solid ${focused ? c.accent : c.inputBorder}`,
        color: c.text,
        fontFamily: 'inherit',
        boxShadow: focused ? `0 0 0 3px ${c.accent}22` : 'none',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function SlugInput({ value, onChange, c }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex items-center overflow-hidden" style={{
      border: `1px solid ${focused ? c.accent : c.inputBorder}`,
      boxShadow: focused ? `0 0 0 3px ${c.accent}22` : 'none',
      transition: 'box-shadow 0.15s',
    }}>
      <span className="px-3 py-2 text-sm select-none flex-shrink-0" style={{ background: c.surface, color: c.faint, borderRight: `1px solid ${c.borderLight}`, fontFamily: 'monospace' }}>
        /view/
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        required
        placeholder=""
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 px-3 py-2 text-sm outline-none"
        style={{ background: c.inputBg, color: c.text, fontFamily: 'monospace' }}
      />
    </div>
  )
}
