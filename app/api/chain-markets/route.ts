import { NextResponse } from 'next/server'

// Proxies the standardized /v0 markets API (exchange-core, 65.x box). Server-side
// so the browser never hits the box directly. /v0 keys markets by `symbol`;
// components still read `name`, so we alias it.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export interface ChainMarket {
  index: number
  name: string
  oraclePrice: number
  markPrice: number
  updatedAt: string
}

export async function GET() {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, {
      next: { revalidate: 5 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return NextResponse.json({ error: `chain feed returned ${res.status}` }, { status: 502 })
    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json({ error: 'chain feed returned malformed payload' }, { status: 502 })
    return NextResponse.json({ markets: data.map((m) => ({ ...m, name: m.symbol })) })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'chain feed unreachable' }, { status: 502 })
  }
}
