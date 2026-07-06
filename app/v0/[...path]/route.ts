import { NextRequest } from 'next/server'

// Public /v0 API, served from the site's own origin (so external callers and the
// docs "try it" client use https://<site>/v0/... , not the raw box). Transparent
// passthrough to the exchange-core markets API — no reshaping; the shapes are the
// OpenAPI contract.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const url = `${CHAIN_MARKETS_API}/v0/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`
  const init: RequestInit = {
    method: req.method,
    headers: { 'content-type': req.headers.get('content-type') ?? 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.text()
  try {
    const res = await fetch(url, init)
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: { message: e instanceof Error ? e.message : 'upstream unreachable' } }), {
      status: 502, headers: { 'content-type': 'application/json' },
    })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path)
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path)
}
