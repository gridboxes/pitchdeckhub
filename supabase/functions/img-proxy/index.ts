const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url).searchParams.get('url')
  if (!url) return new Response('Missing url param', { status: 400, headers: corsHeaders })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MtelBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    })
    const buf = await res.arrayBuffer()
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('Failed to proxy image', { status: 502, headers: corsHeaders })
  }
})
