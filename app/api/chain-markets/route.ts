import { NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Proxies the standardized /v0 markets API (exchange-core, 65.x box). Server-side
// so the browser never hits the box directly. /v0 keys markets by `symbol`;
// components still read `name`, so we alias it. Cached ~4s and shared across all
// users (the data itself only moves every few seconds).
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export interface ChainMarket {
  index: number
  name: string
  oraclePrice: number
  markPrice: number
  updatedAt: string
}

export async function GET() {
  const { body, status } = await cached('chain-markets', 12_000, async () => {
    try {
      const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, { signal: AbortSignal.timeout(22_000) })
      if (!res.ok) return { body: { error: `chain feed returned ${res.status}` }, status: 502 }
      const data = await res.json()
      if (!Array.isArray(data)) return { body: { error: 'chain feed returned malformed payload' }, status: 502 }
      return { body: { markets: data.map((m) => ({ ...m, name: m.symbol })) }, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'chain feed unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(4) : undefined })
}
