import { NextRequest, NextResponse } from 'next/server'

// Live orderbook from the standardized /v0 API (real resting orders on the
// Mango CLOB — no synthetic levels).
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets/${encodeURIComponent(symbol)}/orderbook`, {
      next: { revalidate: 5 },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (!res.ok || !Array.isArray(data?.bids) || !Array.isArray(data?.asks)) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : `chain feed returned ${res.status}`
      return NextResponse.json({ error: message }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'chain feed unreachable' }, { status: 502 })
  }
}
