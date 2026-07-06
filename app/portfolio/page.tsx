'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { MARKETS } from '@/lib/data'
import { fmtPrice } from '@/lib/format'

interface Position {
  symbol: string
  baseUi: number
  unsettledPnlUi: number
}

interface AccountInfo {
  sol: number
  walletUsdc: number
  account: { address: string; usdcUi: number; positions: Position[] } | null
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

// chainSymbol → market page id, so symbols link back to their market
const MARKET_ID_BY_SYMBOL = new Map(
  MARKETS.filter(m => m.chainSymbol).map(m => [m.chainSymbol!, m.id]),
)

export default function Portfolio() {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [info, setInfo] = useState<AccountInfo | null>(null)
  const [fills, setFills] = useState<Fill[] | null>(null)
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!publicKey) {
      setInfo(null)
      setFills(null)
      return
    }
    const owner = publicKey.toBase58()
    fetch(`/api/trade/account?owner=${encodeURIComponent(owner)}`)
      .then(async r => {
        const d = await r.json()
        if (r.ok) { setInfo(d); setError(null) }
        else setError(typeof d.error === 'string' ? d.error : 'account load failed')
      })
      .catch(e => setError(e instanceof Error ? e.message : 'account load failed'))
    fetch(`/api/trade/fills?owner=${encodeURIComponent(owner)}`)
      .then(async r => {
        const d = await r.json()
        if (r.ok && Array.isArray(d.fills)) setFills(d.fills)
      })
      .catch(() => {})
    fetch('/api/chain-markets')
      .then(async r => {
        const d = await r.json()
        if (r.ok && Array.isArray(d.markets)) {
          setMarks(Object.fromEntries(
            d.markets.map((m: { name: string; oraclePrice: number }) => [m.name, m.oraclePrice]),
          ))
        }
      })
      .catch(() => {})
  }, [publicKey])

  useEffect(() => {
    load()
    const iv = setInterval(load, 15_000)
    window.addEventListener('pmxt:trade', load)
    return () => { clearInterval(iv); window.removeEventListener('pmxt:trade', load) }
  }, [load])

  if (!connected) {
    return (
      <div className="max-w-lg font-mono">
        <h1 className="text-lg text-text">&gt; portfolio</h1>
        <div className="mt-4 border border-border rounded-xl bg-panel p-6 text-center">
          <p className="text-xs text-muted">connect a wallet to see your balance, positions, and trade history</p>
          <button
            onClick={() => setVisible(true)}
            className="mt-4 rounded-xl bg-accent/90 hover:bg-accent px-6 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none"
          >
            CONNECT WALLET
          </button>
        </div>
      </div>
    )
  }

  const positions = info?.account?.positions.filter(p => Math.abs(p.baseUi) > 0) ?? []
  const tradable = info?.account?.usdcUi ?? 0
  const totalPnl = positions.reduce((s, p) => s + p.unsettledPnlUi, 0)

  return (
    <div className="flex flex-col gap-6 font-mono">
      <div>
        <h1 className="text-lg text-text">&gt; portfolio</h1>
        {error && <p className="text-xs text-no mt-1">✗ {error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl bg-panel p-4">
          <div className="text-[10px] text-muted uppercase tracking-widest">available to trade</div>
          <div className="text-2xl font-semibold text-text mt-1.5">${tradable.toFixed(2)}</div>
          <div className="text-[10px] text-muted mt-1">usdc in your trading account</div>
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
        <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
          // positions ({positions.length})
        </div>
        {positions.length === 0 ? (
          <div className="px-4 py-4 text-[11px] text-muted">
            no open positions — <Link href="/" className="text-accent hover:underline">find a market</Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50 text-xs">
            <div className="flex px-4 py-2 text-[10px] text-muted uppercase tracking-widest">
              <span className="flex-1">market</span>
              <span className="w-24 text-right">size</span>
              <span className="w-28 text-right hidden sm:block">mark</span>
              <span className="w-28 text-right hidden sm:block">notional</span>
              <span className="w-28 text-right">unsettled pnl</span>
            </div>
            {positions.map(p => {
              const mark = marks[p.symbol]
              const id = MARKET_ID_BY_SYMBOL.get(p.symbol)
              const row = (
                <>
                  <span className="flex-1 text-text">{p.symbol}</span>
                  <span className={`w-24 text-right ${p.baseUi > 0 ? 'text-yes' : 'text-no'}`}>
                    {p.baseUi > 0 ? '+' : ''}{p.baseUi}
                  </span>
                  <span className="w-28 text-right text-muted hidden sm:block">
                    {mark !== undefined ? `$${fmtPrice(mark)}` : '—'}
                  </span>
                  <span className="w-28 text-right text-text hidden sm:block">
                    {mark !== undefined ? `$${fmtPrice(Math.abs(p.baseUi) * mark)}` : '—'}
                  </span>
                  <span className={`w-28 text-right ${p.unsettledPnlUi >= 0 ? 'text-yes' : 'text-no'}`}>
                    {p.unsettledPnlUi >= 0 ? '+' : ''}{p.unsettledPnlUi.toFixed(2)}
                  </span>
                </>
              )
              return id ? (
                <Link key={p.symbol} href={`/markets/${id}`} className="flex px-4 py-2.5 hover:bg-white/[0.03] transition">
                  {row}
                </Link>
              ) : (
                <div key={p.symbol} className="flex px-4 py-2.5">{row}</div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border border-border rounded-xl bg-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
          // trade history{fills ? ` (${fills.length})` : ''}
        </div>
        {!fills ? (
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
                <span className="w-36 text-muted">
                  {new Date(f.time).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                  }).toLowerCase()}
                </span>
                <span className="flex-1 text-text">{f.symbol}</span>
                <span className={`w-14 ${f.side === 'buy' ? 'text-yes' : 'text-no'}`}>{f.side}</span>
                <span className="w-24 text-right text-text">{f.size}</span>
                <span className="w-28 text-right text-text">${fmtPrice(f.price)}</span>
                <span className="w-28 text-right text-muted hidden sm:block">${fmtPrice(f.size * f.price)}</span>
                <span className="w-16 text-right text-muted hidden sm:block">{f.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
