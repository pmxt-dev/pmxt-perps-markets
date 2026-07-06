// Shared server-side cache. There's one Next.js server process, so every user
// hits the same entries — the first request in each TTL window pays the upstream
// cost, everyone else is served from memory. Stale-while-revalidate: once an
// entry exists, requests never block on upstream again; a stale hit is returned
// instantly while a single background refresh runs.
interface Entry {
  at: number
  body: unknown
  status: number
}

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<Entry>>()

export interface Produced {
  body: unknown
  status: number
}

export async function cached(
  key: string,
  ttlMs: number,
  produce: () => Promise<Produced>,
): Promise<Produced> {
  const hit = store.get(key)
  const fresh = hit && Date.now() - hit.at < ttlMs

  const refresh = (): Promise<Entry> => {
    const existing = inflight.get(key)
    if (existing) return existing
    const p = produce()
      .then(({ body, status }) => {
        const entry: Entry = { at: Date.now(), body, status }
        if (status < 500) store.set(key, entry) // don't cache upstream failures
        inflight.delete(key)
        return entry
      })
      .catch((err) => {
        inflight.delete(key)
        throw err
      })
    inflight.set(key, p)
    return p
  }

  if (fresh) return hit!
  if (hit) {
    refresh().catch(() => {}) // serve stale now, refresh in the background
    return hit
  }
  return refresh() // cold — wait for the first fetch
}

// s-maxage lets a CDN (e.g. Vercel edge) share the response across users in prod;
// stale-while-revalidate serves instantly while the edge refreshes.
export function cacheHeaders(sMaxageSec: number): Record<string, string> {
  return { 'Cache-Control': `public, s-maxage=${sMaxageSec}, stale-while-revalidate=${sMaxageSec * 6}` }
}
