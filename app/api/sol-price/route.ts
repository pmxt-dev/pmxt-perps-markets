import { NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// SOL→USD for the create-market cost display (the ~2.5 SOL orderbook rent moves
// with the SOL price). Cached ~2 min at the CDN edge — shared across all users —
// so CoinGecko's free-tier rate limit is never an issue.
export async function GET() {
  const { body, status } = await cached('sol-price', 120_000, async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { signal: AbortSignal.timeout(8_000) },
      )
      const d = await res.json()
      const usd = d?.solana?.usd
      if (typeof usd !== 'number') return { body: { error: 'no price' }, status: 502 }
      return { body: { usd }, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'price unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(120) : undefined })
}
