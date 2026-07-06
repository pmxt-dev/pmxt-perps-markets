import { NextResponse } from 'next/server'

// Full on-chain market catalog (chain state + stored metadata), so the UI can
// show markets deployed at runtime, not just the hardcoded ones.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

export async function GET() {
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/catalog`, {
      next: { revalidate: 5 },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (!res.ok || !Array.isArray(data?.markets)) {
      return NextResponse.json({ error: data?.error ?? 'catalog unavailable' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'catalog unreachable'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
