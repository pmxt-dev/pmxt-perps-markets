import { NextRequest, NextResponse } from 'next/server'

// Deploy a new market: the chain API creates the oracle, lists it through the
// gate, and seeds the book — all server-signed. Slow (several on-chain txs),
// so a generous timeout.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(`${CHAIN_MARKETS_API}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'deploy failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
