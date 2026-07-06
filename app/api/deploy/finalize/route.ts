import { NextRequest, NextResponse } from 'next/server'

// Client-signed create — step 3: after the creator's signed create tx lands, the
// chain API seeds the book and persists metadata.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/deploy/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'finalize failed' }, { status: 502 })
  }
}
