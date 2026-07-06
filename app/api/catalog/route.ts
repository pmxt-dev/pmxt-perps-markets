import { NextResponse } from 'next/server'

// Full market catalog from the standardized /v0 markets API. /v0 Market carries
// everything the old /catalog did (stats + meta); we alias `symbol` → `name` to
// match CatalogEntry.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, {
      next: { revalidate: 5 },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (!res.ok || !Array.isArray(data)) {
      return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
    }
    return NextResponse.json({ markets: data.map((m) => ({ ...m, name: m.symbol })) })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'catalog unreachable' }, { status: 502 })
  }
}
