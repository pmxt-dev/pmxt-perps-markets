import { NextResponse } from 'next/server'
import { MARKETS } from '@/lib/data'

// One round-trip for the homepage: resting-liquidity notional for every onchain
// market (Σ size × level price over both book sides), books fetched in parallel.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

interface BookLevel {
  price: number
  size: number
}

export async function GET() {
  const targets = MARKETS.filter(m => m.sourceType === 'onchain' && m.chainSymbol)
  const entries = await Promise.all(
    targets.map(async (m): Promise<[string, number] | null> => {
      try {
        const res = await fetch(
          `${CHAIN_MARKETS_API}/book?symbol=${encodeURIComponent(m.chainSymbol!)}`,
          { next: { revalidate: 5 }, signal: AbortSignal.timeout(10_000) },
        )
        const data = await res.json()
        if (!res.ok || !Array.isArray(data?.bids) || !Array.isArray(data?.asks)) return null
        const notional = [...data.bids, ...data.asks].reduce(
          (sum: number, l: BookLevel) => sum + l.size * l.price,
          0,
        )
        return [m.id, notional]
      } catch {
        return null
      }
    }),
  )
  const liquidity = Object.fromEntries(entries.filter((e): e is [string, number] => e !== null))
  return NextResponse.json({ liquidity })
}
