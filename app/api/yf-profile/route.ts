import { NextRequest, NextResponse } from 'next/server'

// Company/business summary for a ticker, used to auto-fill a market's
// description. Yahoo's quoteSummary needs a cookie + crumb, which we fetch
// once and cache. Falls back to null if unavailable.
const UA = 'Mozilla/5.0'
let auth: { cookie: string; crumb: string; at: number } | null = null

async function getAuth(): Promise<{ cookie: string; crumb: string } | null> {
  if (auth && Date.now() - auth.at < 30 * 60_000) return auth
  try {
    const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA } })
    const setCookies = r1.headers.getSetCookie?.() ?? []
    const cookie = setCookies.map(c => c.split(';')[0]).join('; ')
    if (!cookie) return null
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    })
    const crumb = (await r2.text()).trim()
    if (!crumb || crumb.includes('<')) return null
    auth = { cookie, crumb, at: Date.now() }
    return auth
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) return NextResponse.json({ description: null }, { status: 400 })

  try {
    const a = await getAuth()
    if (!a) return NextResponse.json({ description: null })
    const res = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile&crumb=${encodeURIComponent(a.crumb)}`,
      { headers: { 'User-Agent': UA, Cookie: a.cookie }, next: { revalidate: 86400 } },
    )
    if (!res.ok) return NextResponse.json({ description: null })
    const data = await res.json()
    const summary: unknown = data?.quoteSummary?.result?.[0]?.assetProfile?.longBusinessSummary
    if (typeof summary !== 'string' || !summary.trim()) {
      return NextResponse.json({ description: null })
    }
    const trimmed = summary.trim()
    const cut = trimmed.length > 320 ? trimmed.slice(0, 320).replace(/\s+\S*$/, '') + '…' : trimmed
    return NextResponse.json({ description: cut.toLowerCase() })
  } catch {
    return NextResponse.json({ description: null })
  }
}
