import { NextRequest, NextResponse } from 'next/server'

// Proxies trading to the standardized /v0 API. Writes return an unsigned tx that
// the browser wallet signs; /v0/transactions broadcasts it. faucet/setup are
// demo-wallet bootstrap (not part of the public trading surface), so they keep
// hitting the internal endpoints.
const CHAIN_MARKETS_API = process.env.CHAIN_MARKETS_API ?? 'http://65.109.107.152:8790'

async function forward(url: string, payload: unknown): Promise<Response> {
  return fetch(`${CHAIN_MARKETS_API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store',
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  try {
    const body = await req.json().catch(() => ({}))
    let res: Response
    let remap = (d: unknown): unknown => d

    if (action === 'order') {
      // /v0/orders takes price/size; the ticket sends priceUi/sizeUi. Response
      // is { transaction }; components read { tx }.
      res = await forward('/v0/orders', {
        owner: body.owner, symbol: body.symbol, side: body.side, type: body.type,
        price: body.priceUi, size: body.sizeUi,
      })
      remap = (d: any) => ({ ...d, tx: d.transaction })
    } else if (action === 'cancel') {
      res = await forward(`/v0/orders/${encodeURIComponent(body.orderId)}/cancellation`, {
        owner: body.owner, symbol: body.symbol,
      })
      remap = (d: any) => ({ ...d, tx: d.transaction })
    } else if (action === 'submit') {
      res = await forward('/v0/transactions', { transaction: body.tx })
    } else if (action === 'faucet') {
      res = await forward('/faucet', body)
    } else if (action === 'setup') {
      res = await forward('/tx/setup', body)
    } else if (action === 'withdraw') {
      res = await forward('/tx/withdraw', body)
    } else if (action === 'settle-pnl') {
      // server-signed crank (permissionless on-chain) — no wallet signature needed
      res = await forward('/settle-pnl', body)
    } else {
      return NextResponse.json({ error: 'unknown action' }, { status: 404 })
    }

    const data = await res.json()
    return NextResponse.json(res.ok ? remap(data) : data, { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'chain feed unreachable' }, { status: 502 })
  }
}

// GET reads map onto /v0/accounts/{address}/... . /v0 returns bare arrays for
// orders/fills; components read { orders } / { fills }, so we wrap them.
const GET_PATHS: Record<string, (a: string) => { url: string; wrap?: string }> = {
  account: (a) => ({ url: `/v0/accounts/${a}` }),
  orders: (a) => ({ url: `/v0/accounts/${a}/orders`, wrap: 'orders' }),
  fills: (a) => ({ url: `/v0/accounts/${a}/fills`, wrap: 'fills' }),
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  const build = GET_PATHS[action]
  if (!build) return NextResponse.json({ error: 'unknown action' }, { status: 404 })
  const owner = req.nextUrl.searchParams.get('owner')?.trim()
  if (!owner) return NextResponse.json({ error: 'owner required' }, { status: 400 })
  try {
    const { url, wrap } = build(encodeURIComponent(owner))
    const res = await fetch(`${CHAIN_MARKETS_API}${url}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' })
    const data = await res.json()
    const body = res.ok && wrap ? { [wrap]: data } : data
    return NextResponse.json(body, { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'chain feed unreachable' }, { status: 502 })
  }
}
