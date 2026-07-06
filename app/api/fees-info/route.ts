import { NextRequest, NextResponse } from 'next/server'

// Creator + claimable fees for a market — read-only, for the claim card.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/fees-info?symbol=${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'fees feed unreachable' }, { status: 502 })
  }
}
