import { NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Full market catalog from the standardized /v0 markets API. /v0 Market carries
// everything the old /catalog did (stats + meta); we alias `symbol` → `name` to
// match CatalogEntry. Cached ~5s, shared across users.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  const { body, status } = await cached('catalog', 5_000, async () => {
    try {
      const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, { signal: AbortSignal.timeout(10_000) })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) return { body: { error: 'catalog unavailable' }, status: 502 }
      return { body: { markets: data.map((m) => ({ ...m, name: m.symbol })) }, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'catalog unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(5) : undefined })
}
