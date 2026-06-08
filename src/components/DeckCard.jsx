import { useState, useEffect, useRef } from 'react'
import { Copy, Pencil, Trash2, Check, MoreHorizontal, ExternalLink, ChevronDown } from 'lucide-react'
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

export default function DeckCard({ deck, members: allMembers = [], dark, onEdit, onDelete, onMemberClick }) {
  const c = theme(dark)
  const [copied, setCopied] = useState(false)
  const [hov, setHov] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const viewUrl = `${BASE_URL}/view/${deck.slug}`
  const members = (deck.member_ids || []).map(id => allMembers.find(m => m.id === id)).filter(Boolean)
  const thumb = screenshotUrl(deck.deck_url)
  const fallback = hashGradient(deck.deck_url)
  const gradientStyle = { background: `linear-gradient(135deg, ${fallback.a}, ${fallback.b})` }

  // 'probing' → shimmer | 'ready' → show image | 'gradient' → color fallback
  const [thumbState, setThumbState] = useState('probing')
  const [imgSrc, setImgSrc] = useState(null)
  const probeRef = useRef(null)

  useEffect(() => {
    if (!thumb) { setThumbState('gradient'); return }
    let alive = true

    function showImage(src) {
      if (!alive) return
      setImgSrc(src)
      setThumbState('ready')
    }

    function probe(attempt = 0) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      let settled = false

      function settle(fn) {
        if (settled || !alive) return
        settled = true
        clearTimeout(probeRef.current)
        fn()
      }

      // Hard timeout — if the network hangs (e.g. sandbox), don't shimmer forever
      probeRef.current = setTimeout(() => settle(() => showImage(thumb)), 5000)

      img.onload = () => settle(() => {
        try {
          // Sample the centre 40% of the image into a 4×4 canvas
          const canvas = document.createElement('canvas')
          canvas.width = 4; canvas.height = 4
          const ctx = canvas.getContext('2d')
          const { naturalWidth: w, naturalHeight: h } = img
          ctx.drawImage(img, w * 0.3, h * 0.3, w * 0.4, h * 0.4, 0, 0, 4, 4)
          const d = ctx.getImageData(0, 0, 4, 4).data
          let brightness = 0
          for (let i = 0; i < d.length; i += 4) brightness += (d[i] + d[i + 1] + d[i + 2]) / 3
          brightness /= 16

          if (brightness < 60) {
            // Near-black → WordPress "Generating Preview…" placeholder; retry
            if (attempt < 8) {
              const delay = Math.min(5000 * (attempt + 1), 20000)
              probeRef.current = setTimeout(() => probe(attempt + 1), delay)
            } else {
              setThumbState('gradient') // gave up after max retries
            }
          } else {
            // Real screenshot confirmed
            showImage(attempt > 0 ? `${thumb}&_=${attempt}` : thumb)
          }
        } catch {
          // canvas.getImageData blocked (CDN doesn't return CORS headers) —
          // can't verify pixels, just show the image
          showImage(thumb)
        }
      })

      img.onerror = () => settle(() => {
        // CORS denied immediately — server doesn't support it; show image directly
        showImage(thumb)
      })

      img.src = attempt > 0 ? `${thumb}&_=${attempt}` : thumb
    }

    setThumbState('probing')
    probe()
    return () => { alive = false; clearTimeout(probeRef.current) }
  }, [thumb])

  function copyLink() {
    navigator.clipboard.writeText(viewUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMenuOpen(false) }}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: '16/9', overflow: 'hidden', background: c.surface }}>
        {thumbState === 'ready' ? (
          <ThumbImage src={imgSrc} alt={deck.client_name} onFail={() => setThumbState('gradient')} />
        ) : thumbState === 'probing' ? (
          <div className="thumb-shimmer absolute inset-0" />
        ) : (
          <div className="w-full h-full" style={gradientStyle} />
        )}

        {/* Hover overlay — stop propagation so card click doesn't fire */}
        <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${hov ? 'opacity-100' : 'opacity-0'}`}>
          <OverlayBtn onClick={onEdit} title="Edit">
            <Pencil size={12} />
          </OverlayBtn>

          <div style={{ position: 'relative' }}>
            <OverlayBtn onClick={() => setMenuOpen(v => !v)} title="More" active={menuOpen}>
              <MoreHorizontal size={12} />
            </OverlayBtn>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 20,
                  background: c.bg, border: `1px solid ${c.borderLight}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  minWidth: 150, overflow: 'hidden',
                }}>
                  <PopoverItem
                    icon={<Trash2 size={11} />}
                    label="Delete"
                    color="#dc2626"
                    hoverBg={dark ? 'rgba(220,38,38,0.10)' : '#fef2f2'}
                    onClick={() => { onDelete(); setMenuOpen(false) }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: c.text, letterSpacing: '-0.1px' }}>
          {deck.client_name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {members.length > 0
            ? members.map(m => <MemberTag key={m.id} member={m} dark={dark} onClick={() => onMemberClick(m)} />)
            : <span className="text-sm" style={{ color: c.faint }}>—</span>
          }
        </div>
        <div
          className="flex items-center justify-between pt-1 mt-auto"
          style={{ borderTop: `1px solid ${c.borderLight}` }}
        >
          <span className="text-xs font-mono" style={{ color: c.faint }}>
            /{deck.slug} · {formatDate(deck.date_added)}
          </span>
          <div className="flex items-center gap-3">
            {/* Open deck */}
            <div style={{ position: 'relative' }}>
              {deck.alt_deck_url && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'none' }} id={`lm-${deck.id}`} />
                </>
              )}
              {deck.alt_deck_url ? (
                <LinkDropdown deck={deck} c={c} />
              ) : (
                <a href={deck.deck_url} target="_blank" rel="noreferrer" title="Open deck"
                  style={{ color: c.faint, display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = c.text}
                  onMouseLeave={e => e.currentTarget.style.color = c.faint}>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
            {/* Copy */}
            {deck.alt_deck_url ? (
              <CopyDropdown deck={deck} c={c} />
            ) : (
              <button
                onClick={copyLink}
                title={copied ? 'Copied!' : 'Copy link'}
                className="flex transition-colors"
                style={{ color: copied ? '#16a34a' : c.faint }}
                onMouseEnter={e => { if (!copied) e.currentTarget.style.color = c.text }}
                onMouseLeave={e => { if (!copied) e.currentTarget.style.color = c.faint }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThumbImage({ src, alt, onFail }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <div className="thumb-shimmer absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={onFail}
        className="w-full h-full object-cover object-top"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
      />
    </>
  )
}

function OverlayBtn({ children, onClick, title, active }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 transition-colors"
      style={{
        color: hov || active ? '#000' : '#333',
        background: hov || active ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.88)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function LinkDropdown({ deck, c }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(v => !v)}
        title="Open deck"
        className="flex items-center gap-0.5 transition-colors"
        style={{ color: open ? c.text : c.faint }}
        onMouseEnter={e => e.currentTarget.style.color = c.text}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = c.faint }}>
        <ExternalLink size={13} />
        <ChevronDown size={8} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 20,
          background: c.bg, border: `1px solid ${c.borderLight}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          minWidth: 140, overflow: 'hidden',
        }}>
          <PopoverItem icon={<ExternalLink size={11} />} label="Deck URL" color={c.text} hoverBg={c.surface} onClick={() => { window.open(deck.deck_url, '_blank'); setOpen(false) }} />
          <PopoverItem icon={<ExternalLink size={11} />} label="Alternative URL" color={c.text} hoverBg={c.surface} onClick={() => { window.open(deck.alt_deck_url, '_blank'); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}

function CopyDropdown({ deck, c }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)

  function copy(url, key) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 1800)
    })
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(v => !v)}
        title="Copy link"
        className="flex items-center gap-0.5 transition-colors"
        style={{ color: copied ? '#16a34a' : open ? c.text : c.faint }}
        onMouseEnter={e => e.currentTarget.style.color = c.text}
        onMouseLeave={e => { if (!open && !copied) e.currentTarget.style.color = c.faint }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {!copied && <ChevronDown size={8} />}
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 20,
          background: c.bg, border: `1px solid ${c.borderLight}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          minWidth: 140, overflow: 'hidden',
        }}>
          <PopoverItem icon={<Copy size={11} />} label="Deck URL" color={c.text} hoverBg={c.surface} onClick={() => copy(deck.deck_url, 'deck')} />
          <PopoverItem icon={<Copy size={11} />} label="Alternative URL" color={c.text} hoverBg={c.surface} onClick={() => copy(deck.alt_deck_url, 'alt')} />
        </div>
      )}
    </div>
  )
}

function PopoverItem({ icon, label, color, hoverBg, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-left transition-colors"
      style={{ color, background: hov ? hoverBg : 'transparent' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon}{label}
    </button>
  )
}
