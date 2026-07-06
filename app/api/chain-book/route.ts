import { NextRequest, NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Live orderbook from the standardized /v0 API (real resting orders on the
// Mango CLOB — no synthetic levels). Cached ~4s per symbol, shared across users.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const { body, status } = await cached(`chain-book:${symbol}`, 4_000, async () => {
    try {
      const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets/${encodeURIComponent(symbol)}/orderbook`, {
        signal: AbortSignal.timeout(10_000),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data?.bids) || !Array.isArray(data?.asks)) {
        const message = typeof data?.error?.message === 'string' ? data.error.message : `chain feed returned ${res.status}`
        return { body: { error: message }, status: 502 }
      }
      return { body: data, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'chain feed unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(4) : undefined })
}
