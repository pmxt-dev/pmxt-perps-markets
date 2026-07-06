import { NextRequest, NextResponse } from 'next/server'

// Claim/distribute a market's accrued fees: the server settles + calls the gate's
// distribute_fees (no user signature needed — the gate PDA signs, funds go to the
// creator + treasury pinned on-chain). Slow (settle + distribute txs).
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      signal: AbortSignal.timeout(90_000),
      cache: 'no-store',
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'distribute failed' }, { status: 502 })
  }
}
