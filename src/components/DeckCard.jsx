import { useState, useEffect } from 'react'
import { Copy, Pencil, Trash2, Check, ExternalLink } from 'lucide-react'
import { theme } from '../lib/theme'
import MemberTag from './MemberTag'

const BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function screenshotUrl(url) {
  try { new URL(url); return `https://s0.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=800&h=450` }
  catch { return null }
}

function hashGradient(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    let h = 0
    for (let i = 0; i < domain.length; i++) h = domain.charCodeAt(i) + ((h << 5) - h)
    const hue = Math.abs(h) % 360
    return { a: `hsl(${hue},45%,82%)`, b: `hsl(${hue},50%,65%)` }
  } catch { return { a: '#e0e7ff', b: '#c7d2fe' } }
}

function isUsableHex(hex) {
  const c = hex.replace('#', '')
  if (c.length !== 6) return false
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 510
  const s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
  return l > 0.08 && l < 0.92 && s > 0.18
}

export default function DeckCard({ deck, dark, cardView = 'thumbnail', onEdit, onDelete, onMemberClick }) {
  const c = theme(dark)
  const [copied, setCopied] = useState(false)
  const [hov, setHov] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const [brandColor, setBrandColor] = useState(null)

  const viewUrl = `${BASE_URL}/view/${deck.slug}`
  const members = [deck.member_one, deck.member_two].filter(Boolean)
  const thumb = screenshotUrl(deck.deck_url)
  const fallback = hashGradient(deck.deck_url)

  useEffect(() => {
    if (!deck.deck_url || cardView !== 'gradient') return
    let cancelled = false
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(deck.deck_url)}&palette=true`)
      .then(r => r.json())
      .then(({ data }) => {
        if (cancelled) return
        const palette = data?.image?.palette ?? data?.logo?.palette ?? []
        const color = palette.find(isUsableHex)
        if (color) setBrandColor(color)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [deck.deck_url, cardView])

  const gradientStyle = brandColor
    ? { background: `linear-gradient(135deg, ${brandColor}bb, ${brandColor})` }
    : { background: `linear-gradient(135deg, ${fallback.a}, ${fallback.b})` }

  function copyLink() {
    navigator.clipboard.writeText(viewUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }

  if (cardView === 'gradient') {
    return (
      <div
        className="flex flex-col transition-all"
        style={{
          background: c.bg,
          border: `1px solid ${hov ? c.borderMid : c.border}`,
          boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <div className="flex flex-col gap-4 p-5">
          {/* Top row: swatch + actions */}
          <div className="flex items-start justify-between">
            <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, ...gradientStyle }} />
            <div className={`flex items-center gap-0.5 transition-opacity ${hov ? 'opacity-100' : 'opacity-0'}`}>
              <ActionBtn onClick={onEdit} title="Edit" hoverColor={c.text} bg={c.hoverBg}>
                <Pencil size={12} />
              </ActionBtn>
              <ActionBtn onClick={onDelete} title="Delete" hoverColor="#dc2626" bg="rgba(220,38,38,0.08)">
                <Trash2 size={12} />
              </ActionBtn>
            </div>
          </div>

          {/* Client name */}
          <div>
            <h3 className="text-xl font-bold leading-tight" style={{ color: c.text, letterSpacing: '-0.3px' }}>
              {deck.client_name}
            </h3>
            {deck.deck_url && (
              <p className="text-sm mt-1 truncate" style={{ color: c.muted }}>
                {(() => { try { return new URL(deck.deck_url).hostname.replace('www.', '') } catch { return deck.deck_url } })()}
              </p>
            )}
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {members.map(m => (
                <MemberTag key={m.id} member={m} dark={dark} onClick={() => onMemberClick(m)} />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-auto" style={{ borderTop: `1px solid ${c.border}` }}>
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: c.faint }}>
              / {deck.slug} · {formatDate(deck.date_added)}
            </span>
            <div className="flex items-center gap-2">
              <a href={deck.deck_url} target="_blank" rel="noreferrer" style={{ color: c.faint }}
                onMouseEnter={e => e.currentTarget.style.color = c.text}
                onMouseLeave={e => e.currentTarget.style.color = c.faint}>
                <ExternalLink size={12} />
              </a>
              <button onClick={copyLink} className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: copied ? '#16a34a' : c.muted }}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Thumbnail view
  return (
    <div
      className="flex flex-col transition-all overflow-hidden"
      style={{
        background: c.bg,
        border: `1px solid ${hov ? c.borderMid : c.border}`,
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="relative" style={{ aspectRatio: '16/9', overflow: 'hidden', background: c.surface }}>
        {thumb && !imgErr ? (
          <img
            src={thumb}
            alt={deck.client_name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full" style={gradientStyle} />
        )}
        <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${hov ? 'opacity-100' : 'opacity-0'}`}>
          <ActionBtn onClick={onEdit} title="Edit" hoverColor={c.text}>
            <Pencil size={12} />
          </ActionBtn>
          <ActionBtn onClick={onDelete} title="Delete" hoverColor="#dc2626">
            <Trash2 size={12} />
          </ActionBtn>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: c.text, letterSpacing: '-0.1px' }}>
          {deck.client_name}
        </h3>
        {members.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {members.map(m => (
              <MemberTag key={m.id} member={m} dark={dark} onClick={() => onMemberClick(m)} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-1" style={{ borderTop: `1px solid ${c.border}` }}>
          <span className="text-xs font-mono" style={{ color: c.faint }}>
            /{deck.slug} · {formatDate(deck.date_added)}
          </span>
          <div className="flex items-center gap-2">
            <a href={deck.deck_url} target="_blank" rel="noreferrer" style={{ color: c.faint }}
              onMouseEnter={e => e.currentTarget.style.color = c.text}
              onMouseLeave={e => e.currentTarget.style.color = c.faint}>
              <ExternalLink size={12} />
            </a>
            <button onClick={copyLink} className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: copied ? '#16a34a' : c.muted }}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick, title, hoverColor, bg }) {
  const [hov, setHov] = useState(false)
  const isOverlay = !bg
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md transition-colors"
      style={{
        color: hov ? hoverColor : '#9ca3af',
        background: isOverlay
          ? (hov ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)')
          : (hov ? (bg || 'transparent') : 'transparent'),
        backdropFilter: isOverlay ? 'blur(4px)' : 'none',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}
