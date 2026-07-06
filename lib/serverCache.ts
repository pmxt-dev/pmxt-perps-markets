// Shared caching is done at the CDN edge via Cache-Control headers (see
// cacheHeaders) — that layer is coherent and shared across all users. We do NOT
// keep an in-process cache: on serverless (Vercel) each instance has its own
// memory, so a process-level cache isn't shared, diverges between instances, and
// serves stale data across a chain reset (this caused "ghost markets" flickering
// in and out as requests hit different instances). So `cached` just runs the
// producer; the CDN + stale-while-revalidate handle sharing and slow upstreams.
export interface Produced {
  body: unknown
  status: number
}

export async function cached(
  _key: string,
  _ttlMs: number,
  produce: () => Promise<Produced>,
): Promise<Produced> {
  return produce()
}

// s-maxage lets the CDN (Vercel edge) share ONE coherent cached response across
// users; stale-while-revalidate serves it instantly while the edge refreshes.
export function cacheHeaders(sMaxageSec: number): Record<string, string> {
  return { 'Cache-Control': `public, s-maxage=${sMaxageSec}, stale-while-revalidate=${sMaxageSec * 6}` }
}
