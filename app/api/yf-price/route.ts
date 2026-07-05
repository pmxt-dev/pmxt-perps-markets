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
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
    return NextResponse.json({ price })
  } catch {
    return NextResponse.json({ price: null }, { status: 502 })
  }
}
