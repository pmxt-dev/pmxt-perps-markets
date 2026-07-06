import { NextRequest, NextResponse } from 'next/server'

// Client-signed create — step 1: the chain API does the server plumbing and
// returns an unsigned create_perp_market tx for the CREATOR to sign (their USDC
// funds the seed). Slow (several server-side txs), so a generous timeout.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/deploy/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'deploy failed' }, { status: 502 })
  }
}
