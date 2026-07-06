import { NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Every market's creator + claimable fees, one shot. The portfolio filters by
// creator to show a wallet its own markets' earnings. Cached ~8s, shared.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  const { body, status } = await cached('fees', 8_000, async () => {
    try {
      const res = await fetch(`${CHAIN_MARKETS_API}/fees`, { signal: AbortSignal.timeout(20_000) })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data?.markets)) return { body: { markets: [] }, status: 200 }
      return { body: data, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'fees feed unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(8) : undefined })
}
