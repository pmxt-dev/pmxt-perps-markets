import { NextRequest, NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Price history from the standardized /v0 candles endpoint, flattened to the
// {t, p} point series the charts expect (p = candle close). Cached ~10s per
// symbol, shared across users.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

interface Candle { t: number; c: number; oc: number | null }

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const { body, status } = await cached(`chain-history:${symbol}`, 30_000, async () => {
    try {
      const res = await fetch(
        `${CHAIN_MARKETS_API}/v0/markets/${encodeURIComponent(symbol)}/candles?interval=1m&limit=500`,
        { signal: AbortSignal.timeout(22_000) },
      )
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) {
        const message = typeof data?.error?.message === 'string' ? data.error.message : `chain feed returned ${res.status}`
        return { body: { error: message }, status: 502 }
      }
      return { body: { symbol, points: (data as Candle[]).map((k) => ({ t: k.t, p: k.c, o: k.oc })) }, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'chain feed unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(10) : undefined })
}
