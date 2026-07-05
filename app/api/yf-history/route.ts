import { NextRequest, NextResponse } from 'next/server'

const WINDOWS: Record<string, { seconds: number; interval: string } | 'max'> = {
  '1h': { seconds: 3600, interval: '1m' },
  '7d': { seconds: 7 * 86400, interval: '15m' },
  '30d': { seconds: 30 * 86400, interval: '1h' },
  '1y': { seconds: 365 * 86400, interval: '1d' },
  '5y': { seconds: 5 * 365 * 86400, interval: '1wk' },
  all: 'max',
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  const tf = req.nextUrl.searchParams.get('tf') ?? '7d'
  const win = WINDOWS[tf]
  if (!symbol || !win) return NextResponse.json({ closes: [] }, { status: 400 })

  const url =
    win === 'max'
      ? `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=max&interval=1mo`
      : `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(Date.now() / 1000) - win.seconds}&period2=${Math.floor(Date.now() / 1000)}&interval=${win.interval}`

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 30 } })
    if (!res.ok) return NextResponse.json({ closes: [] }, { status: 502 })
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (v: unknown): v is number => typeof v === 'number',
    )
    return NextResponse.json({ closes, price: result?.meta?.regularMarketPrice ?? null })
  } catch {
    return NextResponse.json({ closes: [] }, { status: 502 })
  }
}
