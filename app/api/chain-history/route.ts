import { NextRequest, NextResponse } from 'next/server'
import { cached, cacheHeaders } from '@/lib/serverCache'

// Price history from the standardized /v0 candles endpoint, flattened to the
// {t, p} point series the charts expect (p = candle close). Cached ~10s per
// symbol+window, shared across users.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

// candle interval/limit per chart window — the server retains 30 days of 15s
// samples, so wider windows use coarser candles instead of getting truncated
// at the last 500 minutes (which made 24h/all render identically).
const CANDLE_QUERY: Record<string, string> = {
  '24h': 'interval=5m&limit=288',
  all: 'interval=1h&limit=720', // full 30-day retention
}
const DEFAULT_QUERY = 'interval=1m&limit=500' // 5m / 1h / 6h windows

interface Candle { t: number; c: number; oc: number | null; v?: number }

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  const tf = req.nextUrl.searchParams.get('tf')?.trim() ?? ''
  const candleQuery = CANDLE_QUERY[tf] ?? DEFAULT_QUERY

  const { body, status } = await cached(`chain-history:${symbol}:${candleQuery}`, 30_000, async () => {
    try {
      const load = async (query: string) => {
        const res = await fetch(
          `${CHAIN_MARKETS_API}/v0/markets/${encodeURIComponent(symbol)}/candles?${query}`,
          { signal: AbortSignal.timeout(22_000) },
        )
        const data = await res.json()
        if (!res.ok || !Array.isArray(data)) {
          const message = typeof data?.error?.message === 'string' ? data.error.message : `chain feed returned ${res.status}`
          throw new Error(message)
        }
        return (data as Candle[]).map((k) => ({ t: k.t, p: k.c, o: k.oc, v: k.v ?? 0 }))
      }
      let points = await load(candleQuery)
      // a young market may not span 2 coarse buckets yet (charts need ≥2 points
      // to draw) — fall back to fine candles rather than rendering nothing
      if (points.length < 2 && candleQuery !== DEFAULT_QUERY) points = await load(DEFAULT_QUERY)
      return { body: { symbol, points }, status: 200 }
    } catch (e: unknown) {
      return { body: { error: e instanceof Error ? e.message : 'chain feed unreachable' }, status: 502 }
    }
  })
  return NextResponse.json(body, { status, headers: status === 200 ? cacheHeaders(10) : undefined })
}
