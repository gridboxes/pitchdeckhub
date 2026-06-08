import { useState, useEffect, useRef } from 'react'
import { Copy, Pencil, Trash2, Check, MoreHorizontal, ExternalLink, ChevronDown } from 'lucide-react'
import { theme } from '../lib/theme'
import MemberTag from './MemberTag'

const BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function screenshotUrl(url, cacheKey) {
  // Use the canonical s0.wp.com host directly. s0.wordpress.com 301-redirects here,
  // and that redirect drops CORS headers — which breaks the crossOrigin probe we use
  // to detect the "Generating Preview…" placeholder.
  try {
    const u = new URL(url)
    if (cacheKey) {
      // mshots caches by the exact URL string. If it ever captured this URL while
      // it was returning an error (e.g. a fresh Vercel deploy still 404ing), it'll
      // keep serving that stale screenshot indefinitely. Tagging the URL with a
      // stable per-deck key gives mshots a "new" URL to crawl fresh — the live
      // site ignores the unknown param and renders the same page either way.
      u.searchParams.set('_mshot', cacheKey)
    }
    return `https://s0.wp.com/mshots/v1/${encodeURIComponent(u.toString())}?w=800&h=450`
  }
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
  const thumb = screenshotUrl(deck.deck_url, deck.id)
  const fallback = hashGradient(deck.deck_url)
  const gradientStyle = { background: `linear-gradient(135deg, ${fallback.a}, ${fallback.b})` }

  // 'probing' → shimmer | 'ready' → show image | 'gradient' → color fallback
  const [thumbState, setThumbState] = useState('probing')
  const [imgSrc, setImgSrc] = useState(null)
  const probeRef = useRef(null)

  useEffect(() => {
    if (!thumb) { setThumbState('gradient'); return }
    let alive = true

    const MAX_ATTEMPTS = 12          // mShots usually finishes within ~30s
    const urlFor = a => (a > 0 ? `${thumb}&r=${a}` : thumb)
    // Faster polling early (mShots is often ready in 5–15s), easing out after.
    const delayFor = a => Math.min(2000 + a * 1500, 10000)

    function showImage(src) {
      if (!alive) return
      setImgSrc(src)
      setThumbState('ready')
    }

    // Classify a loaded image: WordPress's "Generating Preview…" placeholder is a
    // flat, near-greyscale tile. Detect it by colour + uniformity, not darkness
    // alone (the grey varies in brightness across mShots versions).
    // → 'placeholder' (retry) | 'ready' (real screenshot) | 'unknown' (can't read pixels)
    function classify(img) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 8; canvas.height = 8
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, 8, 8) // whole image, downscaled
        const d = ctx.getImageData(0, 0, 8, 8).data

        const lums = []
        let sum = 0, maxChroma = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          const lum = (r + g + b) / 3
          lums.push(lum); sum += lum
          const chroma = Math.max(r, g, b) - Math.min(r, g, b)
          if (chroma > maxChroma) maxChroma = chroma
        }
        const mean = sum / lums.length
        const std = Math.sqrt(lums.reduce((s, v) => s + (v - mean) ** 2, 0) / lums.length)

        // Placeholder = dim + (near-)greyscale + visually uniform.
        // Real screenshots have colour (chroma) or contrast (std) or are bright.
        if (mean < 110 && maxChroma < 28 && std < 42) return 'placeholder'
        return 'ready'
      } catch {
        return 'unknown' // canvas tainted (no CORS) — can't inspect pixels
      }
    }

    function scheduleRetry(next) {
      if (next > MAX_ATTEMPTS) { setThumbState('gradient'); return }
      probeRef.current = setTimeout(() => probe(next), delayFor(next))
    }

    function probe(attempt = 0) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const url = urlFor(attempt)
      let settled = false

      function settle(fn) {
        if (settled || !alive) return
        settled = true
        clearTimeout(probeRef.current)
        fn()
      }

      // Per-attempt hard timeout so a hung request doesn't stall the poll loop.
      probeRef.current = setTimeout(() => settle(() => scheduleRetry(attempt + 1)), 8000)

      img.onload = () => settle(() => {
        const verdict = classify(img)
        if (verdict === 'ready') {
          showImage(url)
        } else if (verdict === 'placeholder') {
          scheduleRetry(attempt + 1)
        } else {
          // Pixels unreadable: show what we have so the card isn't blank, but
          // keep polling so a placeholder still self-heals to the real shot.
          showImage(url)
          scheduleRetry(attempt + 1)
        }
      })

      img.onerror = () => settle(() => {
        // CORS/network hiccup: can't inspect. Show it (plain <img> has no
        // crossOrigin) and keep polling so it doesn't stay stuck on a placeholder.
        showImage(url)
        scheduleRetry(attempt + 1)
      })

      img.src = url
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
        // Match the probe's crossOrigin so this shares its cache entry and
        // renders instantly instead of re-downloading the screenshot.
        crossOrigin="anonymous"
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
