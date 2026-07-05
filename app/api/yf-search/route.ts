import { NextRequest, NextResponse } from 'next/server'

interface YahooQuote {
  symbol?: string
  shortname?: string
  longname?: string
  exchDisp?: string
  quoteType?: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 } },
    )
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 502 })
    const data = await res.json()
    const results = ((data.quotes ?? []) as YahooQuote[])
      .filter((it) => it.symbol)
      .map((it) => ({
        symbol: it.symbol as string,
        name: it.shortname ?? it.longname ?? '',
        exchange: it.exchDisp ?? '',
        type: it.quoteType ?? '',
      }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 })
  }
}
