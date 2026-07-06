import { NextResponse } from 'next/server'

// Proxies the read-only markets API that fronts the Hayek validator
// (exchange-core scripts/markets_api.ts on the 65.x box). Server-side so the
// browser never talks to the box directly (no mixed-content / CORS issues).
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export interface ChainMarket {
  index: number
  name: string
  oraclePrice: number
  updatedAt: string
}

export async function GET() {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/markets`, {
      next: { revalidate: 5 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `chain feed returned ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    if (!Array.isArray(data?.markets)) {
      return NextResponse.json({ error: 'chain feed returned malformed payload' }, { status: 502 })
    }
    return NextResponse.json({ groupNum: data.groupNum, markets: data.markets as ChainMarket[] })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'chain feed unreachable'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
