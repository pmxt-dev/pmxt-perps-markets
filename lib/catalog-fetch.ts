import { CatalogEntry } from './catalog'

// Server-side market catalog fetch — for sitemap.ts and per-market
// generateMetadata / SSR. Hits the upstream /v0 markets API directly (no
// self-referential /api hop during build/ISR). Returns [] / null on failure so
// callers degrade gracefully rather than throwing during render.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function fetchCatalog(revalidateSeconds = 300): Promise<CatalogEntry[]> {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/v0/markets`, { next: { revalidate: revalidateSeconds } })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    // /v0 keys markets by `symbol`; CatalogEntry uses `name`. Data is external
    // JSON (validated as an array above), so map loosely into the catalog shape.
    return (data as Array<Record<string, unknown>>).map((m) => ({ ...m, name: m.symbol })) as unknown as CatalogEntry[]
  } catch {
    return []
  }
}

// one market by route id (symbol, lowercased), or null if not found
export async function fetchMarketById(id: string, revalidateSeconds = 60): Promise<CatalogEntry | null> {
  const lc = id.toLowerCase()
  const markets = await fetchCatalog(revalidateSeconds)
  return markets.find((m) => m.name.toLowerCase() === lc) ?? null
}
