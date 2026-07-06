import { NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Resting-liquidity notional per market, straight from /v0/markets (which
// already carries liquidityUsd) — one round-trip instead of a book fetch each.
// Keyed by market id (symbol lowercased) to match the UI. Cached ~5s, shared.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  const { body, status } = await cached('chain-liquidity', 5_000, async () => {
    try {
      const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, { signal: AbortSignal.timeout(10_000) })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) return { body: { liquidity: {} }, status: 200 }
      const liquidity = Object.fromEntries(
        data.map((m: { symbol: string; liquidityUsd: number }) => [m.symbol.toLowerCase(), m.liquidityUsd]),
      )
      return { body: { liquidity }, status: 200 }
    } catch {
      return { body: { liquidity: {} }, status: 200 }
    }
  })
  return NextResponse.json(body, { status, headers: cacheHeaders(5) })
}
