'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiError } from '@/lib/apiError'
import Link from 'next/link'
import { Transaction } from '@solana/web3.js'
import { useTradingWallet } from '@/lib/useTradingWallet'
import { fmtPrice, fmtSize } from '@/lib/format'

interface Position {
  symbol: string
  baseUi: number
  unsettledPnlUi: number
}

interface AccountInfo {
  sol: number
  walletUsdc: number
  account: { address: string; usdcUi: number; equityUi?: number; positions: Position[] } | null
}

interface OpenOrder {
  symbol: string
  orderId: string
  side: 'buy' | 'sell'
  price: number
  size: number
}

interface Fill {
  symbol: string
  side: 'buy' | 'sell'
  role: 'taker' | 'maker'
  price: number
  size: number
  time: number
  seqNum: number
}

interface MarketFees {
  symbol: string
  creator: string
  creatorBps: number
  accruedUsd: number
  creatorClaimableUsd: number
}

type Tab = 'positions' | 'orders' | 'history' | 'earnings'

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
const bytesToB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export default function Portfolio() {
  const { publicKey, connected, isDemo, connect, signTransaction } = useTradingWallet()
  const [info, setInfo] = useState<AccountInfo | null>(null)
  const [orders, setOrders] = useState<OpenOrder[] | null>(null)
  const [fills, setFills] = useState<Fill[] | null>(null)
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('positions')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [myMarkets, setMyMarkets] = useState<MarketFees[] | null>(null)
  const [claimingFor, setClaimingFor] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!publicKey) { setInfo(null); setOrders(null); setFills(null); return }
    const owner = publicKey.toBase58()
    fetch(`/api/trade/account?owner=${encodeURIComponent(owner)}`)
      .then(async r => { const d = await r.json(); if (r.ok) { setInfo(d); setError(null) } else setError(apiError(d, 'account load failed')) })
      .catch(e => setError(e instanceof Error ? e.message : 'account load failed'))
    fetch(`/api/trade/orders?owner=${encodeURIComponent(owner)}`)
      .then(async r => { const d = await r.json(); if (r.ok && Array.isArray(d.orders)) setOrders(d.orders) })
      .catch(() => {})
    fetch(`/api/trade/fills?owner=${encodeURIComponent(owner)}`)
      .then(async r => { const d = await r.json(); if (r.ok && Array.isArray(d.fills)) setFills(d.fills) })
      .catch(() => {})
    fetch('/api/chain-markets')
      .then(async r => { const d = await r.json(); if (r.ok && Array.isArray(d.markets)) setMarks(Object.fromEntries(d.markets.map((m: { name: string; markPrice: number }) => [m.name, m.markPrice]))) })
      .catch(() => {})
    // markets this wallet created — its share of trading fees, claimable
    fetch('/api/fees')
      .then(async r => { const d = await r.json(); if (r.ok && Array.isArray(d.markets)) setMyMarkets((d.markets as MarketFees[]).filter(m => m.creator === owner)) })
      .catch(() => {})
  }, [publicKey])

  useEffect(() => {
    load()
    const iv = setInterval(load, 12_000)
    window.addEventListener('pmxt:trade', load)
    return () => { clearInterval(iv); window.removeEventListener('pmxt:trade', load) }
  }, [load])

  const cancelOrder = async (o: OpenOrder) => {
    if (!publicKey || !signTransaction) return
    setError(null)
    setCancelling(o.orderId)
    try {
      const res = await fetch('/api/trade/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: publicKey.toBase58(), symbol: o.symbol, orderId: o.orderId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(apiError(d, 'cancel failed'))
      const signed = await signTransaction(Transaction.from(b64ToBytes(d.tx)))
      const sub = await fetch('/api/trade/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx: bytesToB64(signed.serialize()) }),
      })
      const sd = await sub.json()
      if (!sub.ok) throw new Error(apiError(sd, 'submit failed'))
      load()
      window.dispatchEvent(new Event('pmxt:trade'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'cancel failed')
    } finally {
      setCancelling(null)
    }
  }

  // client-signed: the server builds an unsigned settle+distribute tx with the
  // creator as fee payer; the wallet signs it (creator pays their own trivial
  // gas — spam-proof) and submits. Money splits to creator + protocol on-chain.
  const claimFees = async (symbol: string) => {
    if (!publicKey || !signTransaction) return
    setError(null)
    setClaimingFor(symbol)
    try {
      const r = await fetch('/api/distribute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: publicKey.toBase58(), symbol }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(apiError(d, 'claim failed'))
      const signed = await signTransaction(Transaction.from(b64ToBytes(d.tx)))
      const sub = await fetch('/api/trade/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx: bytesToB64(signed.serialize()) }),
      })
      const sd = await sub.json()
      if (!sub.ok) throw new Error(apiError(sd, 'submit failed'))
      load()
      window.dispatchEvent(new Event('pmxt:trade'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'claim failed')
    } finally {
      setClaimingFor(null)
    }
  }

  if (!connected) {
    return (
      <div className="max-w-lg font-mono">
        <h1 className="text-lg text-text">&gt; portfolio</h1>
        <div className="mt-4 border border-border rounded-xl bg-panel p-6 text-center">
          <p className="text-xs text-muted">connect a wallet to see your balance, positions, orders, and history</p>
          <button onClick={connect} className="mt-4 rounded-xl bg-accent/90 hover:bg-accent px-6 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none">
            {isDemo ? 'START DEMO WALLET' : 'CONNECT WALLET'}
          </button>
        </div>
      </div>
    )
  }

  const positions = info?.account?.positions.filter(p => Math.abs(p.baseUi) > 0) ?? []
  const cash = info?.account?.usdcUi ?? 0
  const totalPnl = positions.reduce((s, p) => s + p.unsettledPnlUi, 0)
  // account value marks positions to market; free margin (init health) is what
  // new exposure can be margined against — cash alone is neither of these
  const accountValue = cash + totalPnl
  const freeMargin = Math.max(0, info?.account?.equityUi ?? cash)

  const TABS: { key: Tab; label: string; count: number | null }[] = [
    { key: 'positions', label: 'positions', count: positions.length },
    { key: 'orders', label: 'open orders', count: orders?.length ?? null },
    { key: 'history', label: 'history', count: fills?.length ?? null },
    { key: 'earnings', label: 'earnings', count: myMarkets?.length ?? null },
  ]

  return (
    <div className="flex flex-col gap-6 font-mono">
      <div>
        <h1 className="text-lg text-text">&gt; portfolio</h1>
        {error && <p className="text-xs text-no mt-1">✗ {error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="border border-border rounded-xl bg-panel p-4">
          <div className="text-[10px] text-muted uppercase tracking-widest">account value</div>
          <div className="text-2xl font-semibold text-text mt-1.5">${accountValue.toFixed(2)}</div>
          <div className="text-[10px] text-muted mt-1">${cash.toFixed(2)} cash {totalPnl >= 0 ? '+' : '−'} ${Math.abs(totalPnl).toFixed(2)} unsettled pnl</div>
        </div>
        <div className="border border-border rounded-xl bg-panel p-4">
          <div className="text-[10px] text-muted uppercase tracking-widest">available to trade</div>
          <div className="text-2xl font-semibold text-text mt-1.5">${freeMargin.toFixed(2)}</div>
          <div className="text-[10px] text-muted mt-1">free margin — cash not backing open positions</div>
        </div>
        <div className="border border-border rounded-xl bg-panel p-4">
          <div className="text-[10px] text-muted uppercase tracking-widest">unsettled pnl</div>
          <div className={`text-2xl font-semibold mt-1.5 ${totalPnl >= 0 ? 'text-yes' : 'text-no'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted mt-1">across {positions.length} open position{positions.length === 1 ? '' : 's'}</div>
        </div>
        <div className="border border-border rounded-xl bg-panel p-4">
          <div className="text-[10px] text-muted uppercase tracking-widest">wallet</div>
          <div className="text-2xl font-semibold text-text mt-1.5">${(info?.walletUsdc ?? 0).toFixed(2)}</div>
          <div className="text-[10px] text-muted mt-1">usdc · ◎ {(info?.sol ?? 0).toFixed(4)} sol</div>
        </div>
      </div>

      <div className="border border-border rounded-xl bg-panel overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-xs uppercase tracking-widest transition border-b-2 -mb-px ${
                tab === t.key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t.label}{t.count !== null ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {tab === 'positions' && (
          positions.length === 0 ? (
            <div className="px-4 py-4 text-[11px] text-muted">
              no open positions — <Link href="/" className="text-accent hover:underline">find a market</Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              <div className="flex px-4 py-2 text-[10px] text-muted uppercase tracking-widest">
                <span className="flex-1">market</span>
                <span className="w-28 text-right">size</span>
                <span className="w-28 text-right hidden sm:block">mark</span>
                <span className="w-28 text-right hidden sm:block">notional</span>
                <span className="w-28 text-right">unsettled pnl</span>
              </div>
              {positions.map(p => {
                const mark = marks[p.symbol]
                const id = p.symbol.toLowerCase() // market page id = symbol lowercased
                const row = (
                  <>
                    <span className="flex-1 text-text">{p.symbol}</span>
                    <span className={`w-28 text-right ${p.baseUi > 0 ? 'text-yes' : 'text-no'}`}>{p.baseUi > 0 ? '+' : ''}{fmtSize(p.baseUi)}</span>
                    <span className="w-28 text-right text-muted hidden sm:block">{mark !== undefined ? `$${fmtPrice(mark)}` : '—'}</span>
                    <span className="w-28 text-right text-text hidden sm:block">{mark !== undefined ? `$${fmtPrice(Math.abs(p.baseUi) * mark)}` : '—'}</span>
                    <span className={`w-28 text-right ${p.unsettledPnlUi >= 0 ? 'text-yes' : 'text-no'}`}>{p.unsettledPnlUi >= 0 ? '+' : ''}{p.unsettledPnlUi.toFixed(2)}</span>
                  </>
                )
                return id
                  ? <Link key={p.symbol} href={`/perps/${id}`} className="flex px-4 py-2.5 hover:bg-white/[0.03] transition">{row}</Link>
                  : <div key={p.symbol} className="flex px-4 py-2.5">{row}</div>
              })}
            </div>
          )
        )}

        {tab === 'orders' && (
          !orders ? (
            <div className="px-4 py-4 text-[11px] text-muted">loading…</div>
          ) : orders.length === 0 ? (
            <div className="px-4 py-4 text-[11px] text-muted">no open orders — limit orders you place will show up here</div>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              <div className="flex px-4 py-2 text-[10px] text-muted uppercase tracking-widest">
                <span className="flex-1">market</span>
                <span className="w-14">side</span>
                <span className="w-24 text-right">size</span>
                <span className="w-28 text-right">price</span>
                <span className="w-28 text-right hidden sm:block">value</span>
                <span className="w-24 text-right"></span>
              </div>
              {orders.map(o => (
                <div key={`${o.symbol}-${o.orderId}`} className="flex items-center px-4 py-2.5">
                  <span className="flex-1 text-text">{o.symbol}</span>
                  <span className={`w-14 ${o.side === 'buy' ? 'text-yes' : 'text-no'}`}>{o.side}</span>
                  <span className="w-24 text-right text-text">{fmtSize(o.size)}</span>
                  <span className="w-28 text-right text-text">${fmtPrice(o.price)}</span>
                  <span className="w-28 text-right text-muted hidden sm:block">${fmtPrice(o.size * o.price)}</span>
                  <span className="w-24 text-right">
                    <button
                      onClick={() => cancelOrder(o)}
                      disabled={cancelling !== null}
                      className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted hover:text-no hover:border-no/40 transition disabled:opacity-40"
                    >
                      {cancelling === o.orderId ? '…' : 'cancel'}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'history' && (
          !fills ? (
            <div className="px-4 py-4 text-[11px] text-muted">loading…</div>
          ) : fills.length === 0 ? (
            <div className="px-4 py-4 text-[11px] text-muted">no fills yet — your executed trades will show up here</div>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              <div className="flex px-4 py-2 text-[10px] text-muted uppercase tracking-widest">
                <span className="w-36">time</span>
                <span className="flex-1">market</span>
                <span className="w-14">side</span>
                <span className="w-24 text-right">size</span>
                <span className="w-28 text-right">price</span>
                <span className="w-28 text-right hidden sm:block">notional</span>
                <span className="w-16 text-right hidden sm:block">role</span>
              </div>
              {fills.map(f => (
                <div key={`${f.symbol}-${f.seqNum}`} className="flex px-4 py-2.5">
                  <span className="w-36 text-muted">{new Date(f.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).toLowerCase()}</span>
                  <span className="flex-1 text-text">{f.symbol}</span>
                  <span className={`w-14 ${f.side === 'buy' ? 'text-yes' : 'text-no'}`}>{f.side}</span>
                  <span className="w-24 text-right text-text">{fmtSize(f.size)}</span>
                  <span className="w-28 text-right text-text">${fmtPrice(f.price)}</span>
                  <span className="w-28 text-right text-muted hidden sm:block">${fmtPrice(f.size * f.price)}</span>
                  <span className="w-16 text-right text-muted hidden sm:block">{f.role}</span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'earnings' && (
          !myMarkets ? (
            <div className="px-4 py-4 text-[11px] text-muted">loading…</div>
          ) : myMarkets.length === 0 ? (
            <div className="px-4 py-4 text-[11px] text-muted">
              you haven&apos;t created any markets — <Link href="/" className="text-accent hover:underline">launch one</Link> and earn a share of its trading fees
            </div>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              <div className="flex px-4 py-2 text-[10px] text-muted uppercase tracking-widest">
                <span className="flex-1">market</span>
                <span className="w-20 text-right">your fee</span>
                <span className="w-28 text-right hidden sm:block">accrued</span>
                <span className="w-28 text-right">claimable</span>
                <span className="w-24 text-right"></span>
              </div>
              {myMarkets.map(m => (
                <div key={m.symbol} className="flex items-center px-4 py-2.5">
                  <Link href={`/perps/${m.symbol.toLowerCase()}`} className="flex-1 text-text hover:text-accent transition">{m.symbol}</Link>
                  <span className="w-20 text-right text-muted">{m.creatorBps} bps</span>
                  <span className="w-28 text-right text-muted hidden sm:block">${fmtPrice(m.accruedUsd)}</span>
                  <span className={`w-28 text-right ${m.creatorClaimableUsd > 0 ? 'text-yes' : 'text-muted'}`}>${fmtPrice(m.creatorClaimableUsd)}</span>
                  <span className="w-24 text-right">
                    <button
                      onClick={() => claimFees(m.symbol)}
                      disabled={claimingFor !== null || m.creatorClaimableUsd <= 0}
                      className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted hover:text-yes hover:border-yes/40 transition disabled:opacity-40"
                    >
                      {claimingFor === m.symbol ? '…' : 'claim'}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
