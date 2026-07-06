import { NextRequest, NextResponse } from 'next/server'

// Proxies trading calls to the chain-side API. The server there builds
// unsigned transactions; the wallet in the browser signs; /submit relays
// the signed bytes to the validator.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

const POST_ACTIONS: Record<string, string> = {
  faucet: '/faucet',
  setup: '/tx/setup',
  order: '/tx/order',
  submit: '/tx/submit',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  const upstream = POST_ACTIONS[action]
  if (!upstream) return NextResponse.json({ error: 'unknown action' }, { status: 404 })
  try {
    const body = await req.text()
    const res = await fetch(`${CHAIN_MARKETS_API}${upstream}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(60_000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'chain feed unreachable'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

const GET_ACTIONS = ['account', 'fills']

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  if (!GET_ACTIONS.includes(action)) return NextResponse.json({ error: 'unknown action' }, { status: 404 })
  const owner = req.nextUrl.searchParams.get('owner')?.trim()
  if (!owner) return NextResponse.json({ error: 'owner required' }, { status: 400 })
  try {
    const res = await fetch(`${CHAIN_MARKETS_API}/${action}?owner=${encodeURIComponent(owner)}`, {
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'chain feed unreachable'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
