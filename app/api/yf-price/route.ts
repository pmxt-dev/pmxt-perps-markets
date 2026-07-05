import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ price: null }, { status: 400 })

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 15 } },
    )
    if (!res.ok) return NextResponse.json({ price: null }, { status: 502 })
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    const price = result?.meta?.regularMarketPrice ?? null
    const prevClose = result?.meta?.chartPreviousClose ?? null
    const change =
      typeof price === 'number' && typeof prevClose === 'number' && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (c: unknown): c is number => typeof c === 'number',
    )
    return NextResponse.json({ price, change, closes })
  } catch {
    return NextResponse.json({ price: null }, { status: 502 })
  }
}
