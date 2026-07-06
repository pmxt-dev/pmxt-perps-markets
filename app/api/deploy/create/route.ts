import { NextRequest, NextResponse } from 'next/server'

// Client-signed create — step 2: after the accounts tx confirms, the chain API
// rebuilds create_perp_market with a FRESH blockhash (+ fresh oracle key) so the
// two wallet prompts never share one blockhash that can expire between them.
// Returns { tx, oracle } — the oracle pubkey must be passed to finalize.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/deploy/create`, {
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
