import { NextRequest, NextResponse } from 'next/server'

// Oracle price history recorded by the chain-side markets API (15s samples,
// kept in memory since the API started — resets when it restarts).
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/history?symbol=${encodeURIComponent(symbol)}`, {
      next: { revalidate: 10 },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (!res.ok || !Array.isArray(data?.points)) {
      const message = typeof data?.error === 'string' ? data.error : `chain feed returned ${res.status}`
      return NextResponse.json({ error: message }, { status: 502 })
    }
    return NextResponse.json({ symbol, points: data.points })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'chain feed unreachable'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
