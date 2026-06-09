import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
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

export default function DeckCard({ deck, members: allMembers = [], dark, onEdit, onDelete }) {
  const c = theme(dark)
  const [copied, setCopied] = useState(false)
  const [hov, setHov] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Only one of the centered hover dropdowns ('open' | 'copy') may be open at
  // a time — they sit close enough together that an open menu can spill over
  // its neighbor's trigger, which would otherwise pop both open at once.
  const [activeDropdown, setActiveDropdown] = useState(null)

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

        {/* Mobile: no hover, so pin compact icon buttons to a corner instead */}
        <div className="flex sm:hidden absolute top-2 right-2 gap-1.5 z-10">
          {deck.alt_deck_url ? (
            <MobileLinkDropdown deck={deck} c={c} />
          ) : (
            <MobileActionBtn href={deck.deck_url} title="Open deck">
              <ExternalLink size={13} />
            </MobileActionBtn>
          )}
          {deck.alt_deck_url ? (
            <MobileCopyDropdown deck={deck} c={c} />
          ) : (
            <MobileActionBtn onClick={copyLink} title={copied ? 'Copied!' : 'Copy link'}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </MobileActionBtn>
          )}
        </div>

        {/* Primary actions — centered on thumbnail hover (desktop only) */}
        <div
          className="hidden sm:flex absolute inset-0 items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.4)',
            opacity: hov ? 1 : 0,
            pointerEvents: hov ? 'auto' : 'none',
            transition: 'opacity 0.22s ease',
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              opacity: hov ? 1 : 0,
              transform: hov ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.96)',
              transition: 'opacity 0.22s ease, transform 0.22s ease',
              transitionDelay: hov ? '0.04s' : '0s',
            }}
          >
            {deck.alt_deck_url ? (
              <CenterLinkDropdown deck={deck} c={c} hov={hov} active={activeDropdown === 'open'} setActive={v => setActiveDropdown(k => v ? 'open' : (k === 'open' ? null : k))} />
            ) : (
              <CenterActionBtn href={deck.deck_url} title="Open deck">
                <ExternalLink size={15} />
                Open
              </CenterActionBtn>
            )}
            {deck.alt_deck_url ? (
              <CenterCopyDropdown deck={deck} c={c} hov={hov} active={activeDropdown === 'copy'} setActive={v => setActiveDropdown(k => v ? 'copy' : (k === 'copy' ? null : k))} />
            ) : (
              <CenterActionBtn onClick={copyLink} title={copied ? 'Copied!' : 'Copy link'}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy link'}
              </CenterActionBtn>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 pb-3 flex-1">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: c.text, letterSpacing: '-0.1px' }}>
          {deck.client_name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {members.length > 0
            ? members.map(m => <MemberTag key={m.id} member={m} dark={dark} />)
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
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              title="More"
              className="flex p-1 transition-colors"
              style={{ color: menuOpen ? c.text : c.faint }}
              onMouseEnter={e => e.currentTarget.style.color = c.text}
              onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.color = c.faint }}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, zIndex: 20,
                  background: c.bg, border: `1px solid ${c.borderLight}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  minWidth: 150, overflow: 'hidden',
                }}>
                  <PopoverItem
                    icon={<Pencil size={11} />}
                    label="Edit"
                    color={c.text}
                    hoverBg={c.surface}
                    onClick={() => { onEdit(); setMenuOpen(false) }}
                  />
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

function CenterActionBtn({ href, onClick, title, children, btnRef }) {
  const [hov, setHov] = useState(false)
  const style = {
    color: '#fff',
    background: hov ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(255,255,255,0.35)',
  }
  const className = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors'
  const handlers = { onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false) }
  return href
    ? <a ref={btnRef} href={href} target="_blank" rel="noreferrer" title={title} className={className} style={style} {...handlers}>{children}</a>
    : <button ref={btnRef} onClick={onClick} title={title} className={className} style={style} {...handlers}>{children}</button>
}

// Always-visible icon button for touch devices, where hover isn't available —
// pinned to the thumbnail corner instead of appearing on hover like the desktop overlay.
function MobileActionBtn({ href, onClick, title, children, btnRef, wide }) {
  const style = {
    color: '#fff',
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.3)',
  }
  // `wide` marks dropdown triggers (icon + chevron) — visually distinct from
  // the plain square icon buttons used when there's no alt-URL choice to make.
  const className = wide
    ? 'flex items-center justify-center gap-1 h-7 px-2 transition-colors'
    : 'flex items-center justify-center w-7 h-7 transition-colors'
  return href
    ? <a ref={btnRef} href={href} target="_blank" rel="noreferrer" title={title} className={className} style={style} onClick={e => e.stopPropagation()}>{children}</a>
    : <button ref={btnRef} onClick={e => { e.stopPropagation(); onClick(e) }} title={title} className={className} style={style}>{children}</button>
}

// Closes an open menu on a click/tap outside both the trigger and the menu
// itself. Deliberately a passive document listener rather than a full-screen
// catcher overlay — a catcher would sit on top of *other* trigger buttons and
// swallow the click meant to switch to them, forcing a second click to open.
function useCloseOnOutside(active, refs, onClose) {
  useEffect(() => {
    if (!active) return
    function handler(e) {
      for (const ref of refs) if (ref.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [active])
}

// Tap-to-open variants of the alt-URL pickers for touch devices — FloatingMenu
// is reused for positioning; closing happens on outside tap (see useCloseOnOutside).
function MobileLinkDropdown({ deck, c }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  useCloseOnOutside(open, [triggerRef, menuRef], () => setOpen(false))

  return (
    <>
      <MobileActionBtn btnRef={triggerRef} onClick={() => setOpen(v => !v)} title="Open deck" wide>
        <ExternalLink size={13} />
        <ChevronDown size={10} />
      </MobileActionBtn>
      <FloatingMenu triggerRef={triggerRef} menuRef={menuRef} open={open} c={c}>
        <PopoverItem icon={<ExternalLink size={11} />} label="Deck URL" color={c.text} hoverBg={c.surface} onClick={() => { window.open(deck.deck_url, '_blank'); setOpen(false) }} />
        <PopoverItem icon={<ExternalLink size={11} />} label="Alternative URL" color={c.text} hoverBg={c.surface} onClick={() => { window.open(deck.alt_deck_url, '_blank'); setOpen(false) }} />
      </FloatingMenu>
    </>
  )
}

function MobileCopyDropdown({ deck, c }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  useCloseOnOutside(open, [triggerRef, menuRef], () => setOpen(false))

  function copy(url, key) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 1800)
    })
    setOpen(false)
  }

  return (
    <>
      <MobileActionBtn btnRef={triggerRef} onClick={() => setOpen(v => !v)} title="Copy link" wide>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {!copied && <ChevronDown size={10} />}
      </MobileActionBtn>
      <FloatingMenu triggerRef={triggerRef} menuRef={menuRef} open={open} c={c}>
        <PopoverItem icon={<Copy size={11} />} label="Deck URL" color={c.text} hoverBg={c.surface} onClick={() => copy(deck.deck_url, 'deck')} />
        <PopoverItem icon={<Copy size={11} />} label="Alternative URL" color={c.text} hoverBg={c.surface} onClick={() => copy(deck.alt_deck_url, 'alt')} />
      </FloatingMenu>
    </>
  )
}

// Renders the popover in a portal positioned by the trigger's screen rect, so it
// opens downward without being clipped by the thumbnail's `overflow: hidden` or
// covered by the card's title/body underneath.
function FloatingMenu({ triggerRef, menuRef, open, c, children, onMouseEnter, onMouseLeave }) {
  const [pos, setPos] = useState(null)

  const MIN_WIDTH = 150

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function reposition() {
      const r = triggerRef.current.getBoundingClientRect()
      // Flip to right-aligned when left-aligned would overflow the viewport
      // (e.g. the mobile corner buttons sit right up against the edge).
      const overflowsRight = r.left + MIN_WIDTH > window.innerWidth
      // Document-relative coordinates (not viewport-relative): with `position:
      // absolute` the browser scrolls this along with the page natively, so it
      // can't lag behind like a JS-recomputed `position: fixed` would.
      setPos(overflowsRight
        ? { top: r.bottom + window.scrollY + 6, right: document.documentElement.clientWidth - r.right - window.scrollX }
        : { top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX })
    }

    reposition()
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [open, triggerRef])

  if (!open || !pos) return null

  return createPortal(
    <div
      ref={menuRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute', top: pos.top, left: pos.left, right: pos.right, zIndex: 101,
        background: c.bg, border: `1px solid ${c.borderLight}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        minWidth: MIN_WIDTH, overflow: 'hidden',
      }}>
      {children}
    </div>,
    document.body
  )
}

// Click-to-toggle dropdowns. `active`/`setActive` are lifted to the card so
// only one is open at a time (they sit close enough that an open menu can
// spill over its neighbor's trigger). Closes when the cursor leaves the card,
// or on outside click (see useCloseOnOutside).
function useClickOpen(hov, active, setActive, triggerRef, menuRef) {
  useEffect(() => { if (!hov && active) setActive(false) }, [hov])
  useCloseOnOutside(active, [triggerRef, menuRef], () => setActive(false))

  function toggle() { setActive(!active) }
  function close() { setActive(false) }

  return [toggle, close]
}

function CenterLinkDropdown({ deck, c, hov, active, setActive }) {
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [toggle, close] = useClickOpen(hov, active, setActive, triggerRef, menuRef)

  return (
    <div style={{ display: 'inline-flex' }}>
      <CenterActionBtn btnRef={triggerRef} onClick={toggle} title="Open deck">
        <ExternalLink size={15} />
        Open
        <ChevronDown size={11} />
      </CenterActionBtn>
      <FloatingMenu triggerRef={triggerRef} menuRef={menuRef} open={active} c={c}>
        <PopoverItem icon={<ExternalLink size={11} />} label="Deck URL" color={c.text} hoverBg={c.surface} onClick={() => { window.open(deck.deck_url, '_blank'); close() }} />
        <PopoverItem icon={<ExternalLink size={11} />} label="Alternative URL" color={c.text} hoverBg={c.surface} onClick={() => { window.open(deck.alt_deck_url, '_blank'); close() }} />
      </FloatingMenu>
    </div>
  )
}

function CenterCopyDropdown({ deck, c, hov, active, setActive }) {
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [toggle, close] = useClickOpen(hov, active, setActive, triggerRef, menuRef)
  const [copied, setCopied] = useState(null)

  function copy(url, key) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 1800)
    })
    close()
  }

  return (
    <div style={{ display: 'inline-flex' }}>
      <CenterActionBtn btnRef={triggerRef} onClick={toggle} title="Copy link">
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'Copied' : 'Copy link'}
        {!copied && <ChevronDown size={11} />}
      </CenterActionBtn>
      <FloatingMenu triggerRef={triggerRef} menuRef={menuRef} open={active} c={c}>
        <PopoverItem icon={<Copy size={11} />} label="Deck URL" color={c.text} hoverBg={c.surface} onClick={() => copy(deck.deck_url, 'deck')} />
        <PopoverItem icon={<Copy size={11} />} label="Alternative URL" color={c.text} hoverBg={c.surface} onClick={() => copy(deck.alt_deck_url, 'alt')} />
      </FloatingMenu>
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
