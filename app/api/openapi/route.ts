// Serves the OpenAPI spec same-origin (the docs page fetches it from here).
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/v0/openapi.yaml`, { next: { revalidate: 60 } })
    const text = await res.text()
    return new Response(text, { headers: { 'content-type': 'text/yaml' }, status: res.status })
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : 'spec unreachable', { status: 502 })
  }
}
