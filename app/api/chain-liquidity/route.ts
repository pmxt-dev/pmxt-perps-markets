import { NextResponse } from 'next/server'

// Resting-liquidity notional per market, straight from /v0/markets (which
// already carries liquidityUsd) — one round-trip instead of a book fetch each.
// Keyed by market id (symbol lowercased) to match the UI.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, {
      next: { revalidate: 5 },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (!res.ok || !Array.isArray(data)) return NextResponse.json({ liquidity: {} })
    const liquidity = Object.fromEntries(
      data.map((m: { symbol: string; liquidityUsd: number }) => [m.symbol.toLowerCase(), m.liquidityUsd]),
    )
    return NextResponse.json({ liquidity })
  } catch {
    return NextResponse.json({ liquidity: {} })
  }
}
