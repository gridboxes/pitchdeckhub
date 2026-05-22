const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) return json({ color: null })

    const origin = new URL(url).origin

    // --- 1. Fetch homepage HTML ---
    let html = ''
    try {
      const res = await fetch(origin, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(7000),
        redirect: 'follow',
      })
      html = await res.text()
    } catch { /* site unreachable, continue to CSS attempt */ }

    // --- 2. Try meta theme-color ---
    if (html) {
      const metaColor = matchMeta(html, 'theme-color') || matchMeta(html, 'msapplication-TileColor')
      if (metaColor && isUsableColor(metaColor)) return json({ color: metaColor })
    }

    // --- 3. Scan inline <style> blocks in the HTML ---
    if (html) {
      const inlineCss = extractInlineStyles(html)
      if (inlineCss) {
        const color = dominantColor(inlineCss)
        if (color) return json({ color })
      }
    }

    // --- 4. Find all .css hrefs in the HTML and try each ---
    if (html) {
      const cssUrls = findCssLinks(html, origin)
      for (const cssUrl of cssUrls.slice(0, 3)) {
        try {
          const cssRes = await fetch(cssUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
          })
          const css = await cssRes.text()
          const color = dominantColor(css)
          if (color) return json({ color })
        } catch { continue }
      }
    }

    return json({ color: null })
  } catch {
    return json({ color: null })
  }
})

// ── helpers ───────────────────────────────────────────────────────────────────

function matchMeta(html: string, name: string): string | null {
  // Match both attribute orderings
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function extractInlineStyles(html: string): string {
  const results: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) results.push(m[1])
  return results.join('\n')
}

function findCssLinks(html: string, origin: string): string[] {
  const results: string[] = []
  // Find every href="...css..." in the HTML
  const re = /href=["']([^"']+\.css[^"']*?)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    if (href.startsWith('http')) results.push(href)
    else if (href.startsWith('//')) results.push('https:' + href)
    else results.push(origin + (href.startsWith('/') ? '' : '/') + href)
  }
  return results
}

// Well-known Bootstrap / Tailwind / Material utility colors to ignore
const FRAMEWORK_COLORS = new Set([
  '#007bff','#6610f2','#6f42c1','#e83e8c','#dc3545','#fd7e14','#ffc107',
  '#28a745','#20c997','#17a2b8','#ffffff','#000000',
  '#343a40','#6c757d','#dee2e6','#e9ecef','#f8f9fa','#212529','#495057',
  '#f5c6cb','#f8d7da','#d6d8db','#c6c8ca','#bee5eb','#b8daff','#c3e6cb',
  '#ffeeba','#fdfdfe','#868e96','#adb5bd','#ced4da',
  // Tailwind grays/slate
  '#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563',
  '#374151','#1f2937','#111827',
])

function dominantColor(css: string): string | null {
  // First pass: CSS custom properties that look like brand/primary colors
  const varDecls = css.match(/--(?:primary|brand|accent|color|main|theme)[^:]*:\s*([^;}{]+)/gi) ?? []
  for (const decl of varDecls) {
    const hex = decl.match(/#[0-9a-fA-F]{6}/)
    if (hex && isUsableColor(hex[0]) && !FRAMEWORK_COLORS.has(hex[0].toLowerCase())) {
      return hex[0].toLowerCase()
    }
  }

  // Second pass: background-color declarations, excluding framework colors
  const bgDecls = css.match(/background(?:-color)?\s*:\s*([^;}{]+)/gi) ?? []
  const bgFreq: Record<string, number> = {}
  for (const decl of bgDecls) {
    const hexes = decl.match(/#[0-9a-fA-F]{6}/g) ?? []
    for (const hex of hexes) {
      const norm = hex.toLowerCase()
      if (!isUsableColor(norm) || FRAMEWORK_COLORS.has(norm)) continue
      bgFreq[norm] = (bgFreq[norm] ?? 0) + 1
    }
  }
  const bgSorted = Object.entries(bgFreq).sort((a, b) => b[1] - a[1])
  if (bgSorted[0]) return bgSorted[0][0]

  // Third pass: all hex colors, excluding framework colors, by frequency
  const all = css.match(/#[0-9a-fA-F]{6}/g) ?? []
  const freq: Record<string, number> = {}
  for (const hex of all) {
    const norm = hex.toLowerCase()
    if (!isUsableColor(norm) || FRAMEWORK_COLORS.has(norm)) continue
    freq[norm] = (freq[norm] ?? 0) + 1
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

function isUsableColor(hex: string): boolean {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2 / 255
  const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
  if (lightness > 0.92 || lightness < 0.06) return false
  if (saturation < 0.12) return false
  return true
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
