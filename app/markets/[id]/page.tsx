'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MARKETS } from '@/lib/data'
import { Market } from '@/lib/types'
import { catalogToMarket, CatalogEntry } from '@/lib/catalog'
import { fmtPrice } from '@/lib/format'
import { useTradingWallet } from '@/lib/useTradingWallet'
import Sparkline from '@/components/Sparkline'
import BuySell from '@/components/BuySell'
import OrderBook, { BookData } from '@/components/OrderBook'
import { Transaction } from '@solana/web3.js'

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
const bytesToB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const TIMEFRAMES = ['1h', '7d', '30d', '1y', '5y', 'all'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

// chain history buffer holds 24h of 15s samples — longer windows don't exist
const CHAIN_TIMEFRAMES = ['5m', '1h', '6h', '24h', 'all'] as const
type ChainTimeframe = (typeof CHAIN_TIMEFRAMES)[number]
const CHAIN_TF_MS: Record<Exclude<ChainTimeframe, 'all'>, number> = {
  '5m': 5 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
}

interface ChainPoint {
  t: number
  p: number
  o?: number | null // null = market closed at this point → gap in the oracle line
}

export default function MarketDetail() {
  const params = useParams()
  const id = params?.id as string
  const staticMarket = MARKETS.find(m => m.id === id)
  // markets deployed at runtime aren't in the static catalog — resolve from chain
  const [catalogMarket, setCatalogMarket] = useState<Market | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  useEffect(() => {
    if (staticMarket) { setCatalogLoading(false); return }
    let cancelled = false
    fetch('/api/catalog')
      .then(async r => {
        const d = await r.json()
        if (cancelled) return
        if (r.ok && Array.isArray(d.markets)) {
          const e = (d.markets as CatalogEntry[]).find(x => x.name.toLowerCase() === id)
          if (e) setCatalogMarket(catalogToMarket(e))
        }
        setCatalogLoading(false)
      })
      .catch(() => { if (!cancelled) setCatalogLoading(false) })
    return () => { cancelled = true }
  }, [staticMarket, id])
  const market = staticMarket ?? catalogMarket
  const [liveOracle, setLiveOracle] = useState<number | null>(null)
  const [liveMark, setLiveMark] = useState<number | null>(null)
  const [liveVol, setLiveVol] = useState<number | null>(null)
  // is a live external feed driving the oracle right now? (false off-hours) —
  // drives whether we draw the oracle line at all
  const [feedLive, setFeedLive] = useState<boolean>(false)
  const [tf, setTf] = useState<Timeframe>('7d')
  const [chainTf, setChainTf] = useState<ChainTimeframe>('all')
  const [history, setHistory] = useState<number[] | null>(null)
  const [chainPoints, setChainPoints] = useState<ChainPoint[] | null>(null)

  const ticker = market?.sourceType === 'yfinance' ? market.sourceTicker : undefined
  useEffect(() => {
    if (!ticker) return
    let cancelled = false
    const load = () =>
      fetch(`/api/yf-history?symbol=${encodeURIComponent(ticker)}&tf=${tf}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          if (Array.isArray(d.closes) && d.closes.length >= 2) setHistory(d.closes)
          if (typeof d.price === 'number') setLiveOracle(d.price)
        })
        .catch(() => {})
    load()
    const iv = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [ticker, tf])

  // onchain markets: oracle price comes from the deployed Hayek chain
  const chainSymbol = market?.sourceType === 'onchain' ? market.chainSymbol : undefined
  const [chainError, setChainError] = useState<string | null>(null)
  const [book, setBook] = useState<BookData | null>(null)
  const [bookError, setBookError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  // a fill from the ticket refreshes book/price immediately instead of waiting for the poll
  useEffect(() => {
    const bump = () => setRefreshTick(t => t + 1)
    window.addEventListener('pmxt:trade', bump)
    return () => window.removeEventListener('pmxt:trade', bump)
  }, [])
  useEffect(() => {
    if (!chainSymbol) return
    let cancelled = false
    const load = () =>
      fetch('/api/chain-markets')
        .then(async r => {
          const d = await r.json()
          if (cancelled) return
          if (!r.ok || !Array.isArray(d.markets)) {
            setChainError(typeof d.error === 'string' ? d.error : 'chain feed unreachable')
            return
          }
          setChainError(null)
          const found = d.markets.find((cm: { name: string }) => cm.name === chainSymbol)
          if (found && typeof found.oraclePrice === 'number') setLiveOracle(found.oraclePrice)
          if (found && typeof found.markPrice === 'number') setLiveMark(found.markPrice)
          if (found && typeof found.volume24hUsd === 'number') setLiveVol(found.volume24hUsd)
          if (found && typeof found.oracleLive === 'boolean') setFeedLive(found.oracleLive)
        })
        .catch(e => {
          if (!cancelled) setChainError(e instanceof Error ? e.message : 'chain feed unreachable')
        })
    const loadHistory = () =>
      fetch(`/api/chain-history?symbol=${encodeURIComponent(chainSymbol)}`)
        .then(async r => {
          const d = await r.json()
          if (cancelled || !r.ok || !Array.isArray(d.points)) return
          const points = d.points.filter(
            (pt: unknown): pt is ChainPoint =>
              typeof (pt as ChainPoint)?.t === 'number' && typeof (pt as ChainPoint)?.p === 'number',
          )
          if (points.length >= 2) setChainPoints(points)
        })
        .catch(() => {})
    const loadBook = () =>
      fetch(`/api/chain-book?symbol=${encodeURIComponent(chainSymbol)}`)
        .then(async r => {
          const d = await r.json()
          if (cancelled) return
          if (!r.ok || !Array.isArray(d.bids) || !Array.isArray(d.asks)) {
            setBookError(typeof d.error === 'string' ? d.error : 'chain feed unreachable')
            return
          }
          setBookError(null)
          setBook({ bids: d.bids, asks: d.asks })
        })
        .catch(e => {
          if (!cancelled) setBookError(e instanceof Error ? e.message : 'chain feed unreachable')
        })
    load()
    loadHistory()
    loadBook()
    const iv = setInterval(() => { load(); loadHistory(); loadBook() }, 6_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [chainSymbol, refreshTick])

  if (!market) {
    return (
      <div className="font-mono text-sm">
        <div className={catalogLoading ? 'text-muted' : 'text-no'}>
          {catalogLoading ? 'loading market…' : '✗ market not found'}
        </div>
        <Link href="/" className="text-accent hover:underline text-xs mt-2 inline-block">
          &lt; back to markets
        </Link>
      </div>
    )
  }

  const isYf = market.sourceType === 'yfinance'
  const isChain = market.sourceType === 'onchain'
  // headline metric: notional of REAL resting orders on the book (Σ size × level price,
  // both sides) — a defensible "tradeable market" number, unlike OI on a fresh listing
  const restingLiquidity = book
    ? [...book.bids, ...book.asks].reduce((sum, l) => sum + l.size * l.price, 0)
    : null
  // onchain markets: mark = book mid (from the API), which moves with trades.
  // oraclePrice is the raw stub oracle — only meaningful for oracle-fed markets.
  const oraclePrice = isChain ? (liveOracle ?? market.price) : (liveOracle ?? market.price * 1.0018)
  const markPrice = isChain ? (liveMark ?? liveOracle ?? market.price) : liveOracle ? liveOracle / 1.0018 : market.price
  // onchain markets: chart = recorded mark-price series (p), windowed by timeframe
  const chainCloses = (() => {
    if (!isChain || !chainPoints) return null
    const windowed = chainTf === 'all'
      ? chainPoints
      : chainPoints.filter(pt => pt.t >= Date.now() - CHAIN_TF_MS[chainTf])
    const series = windowed.length >= 2 ? windowed : chainPoints
    return series.map(pt => pt.p)
  })()
  // oracle overlay series for oracle-fed chain markets — traces the feed, with
  // nulls (gaps) where the market was closed so the line breaks into per-session
  // segments instead of drawing a fake continuous feed
  const chainOracleCloses = (() => {
    if (!isChain || market.selfOracled || !chainPoints) return null
    const windowed = chainTf === 'all'
      ? chainPoints
      : chainPoints.filter(pt => pt.t >= Date.now() - CHAIN_TF_MS[chainTf])
    const series = windowed.length >= 2 ? windowed : chainPoints
    const o = series.map(pt => (typeof pt.o === 'number' ? pt.o : null))
    return o.some(v => v !== null) ? o : null
  })()

  // yfinance markets: chart = real history (mark = oracle / skew), oracle drawn as line series.
  // onchain markets: chart = the mark-price series; oracle-fed markets overlay the oracle line.
  // orderbook markets: static mock walk, no external oracle to overlay.
  const chartData = isYf && history
    ? history.map((p) => p / 1.0018)
    : chainCloses
      ? chainCloses
      : market.sparkline?.map((p) => p * (markPrice / market.price))
  const oracleSeries = isYf && history
    ? history
    : chainOracleCloses ?? undefined
  const changePct = isYf && history
    ? ((history[history.length - 1] - history[0]) / history[0]) * 100
    : chainCloses
      ? ((chainCloses[chainCloses.length - 1] - chainCloses[0]) / chainCloses[0]) * 100
      : market.change24h
  const up = changePct >= 0
  const changeLabel = isYf && history ? tf : chainCloses ? chainTf : '24h'

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="font-mono text-xs text-muted hover:text-text transition">
        &lt; back to markets
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="border border-border rounded-xl bg-panel overflow-hidden font-mono">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted uppercase tracking-widest">// {market.id}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/10 border border-accent/40 text-accent">
                {market.status.toLowerCase()}
              </span>
            </div>

            <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2.5">
                {market.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={market.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">&gt; {market.symbol}</div>
                  <div className="text-xs text-muted mt-1">{market.asset.toLowerCase()} · {market.category.toLowerCase()}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-2xl font-semibold leading-none ${up ? 'text-yes' : 'text-no'}`}>
                  ${fmtPrice(markPrice)}
                </div>
                <div className={`text-[10px] uppercase tracking-wide mt-1 ${up ? 'text-yes' : 'text-no'}`}>
                  {up ? '▲' : '▼'} {up ? '+' : ''}{changePct.toFixed(2)}% {changeLabel}
                </div>
              </div>
            </div>

            {isYf && (
              <div className="px-4 pb-2 flex gap-1.5 font-mono">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTf(t)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                      tf === t ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {isChain && (
              <div className="px-4 pb-2 flex gap-1.5 font-mono">
                {CHAIN_TIMEFRAMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setChainTf(t)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                      chainTf === t ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              {chartData && <Sparkline data={chartData} isPositive={up} oracleSeries={oracleSeries} />}
              {isYf ? (
                <div className="absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border border-[#ff9f43]/40 rounded-md px-1.5 py-0.5 pointer-events-none">
                  <span className="text-[#ff9f43]">— oracle ${fmtPrice(oraclePrice)}</span>
                  <span className="text-muted ml-1.5">yfinance · {market.sourceTicker}</span>
                </div>
              ) : isChain && market.selfOracled ? (
                <div className="absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border border-border rounded-md px-1.5 py-0.5 pointer-events-none">
                  {chainError ? (
                    <span className="text-no">✗ chain feed: {chainError}</span>
                  ) : (
                    <span className="text-muted" title="No external feed. Price = this market's own order book, time-averaged (EMA) so one trade can't move it.">self-priced — the order book is the feed (EMA) · pmxt chain</span>
                  )}
                </div>
              ) : isChain ? (
                <div className={`absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border rounded-md px-1.5 py-0.5 pointer-events-none ${feedLive ? 'border-yes/40' : 'border-border'}`}>
                  {chainError ? (
                    <span className="text-no">✗ chain feed: {chainError}</span>
                  ) : feedLive ? (
                    <>
                      <span className="text-yes">— oracle ${fmtPrice(oraclePrice)}</span>
                      <span className="text-muted ml-1.5">pmxt chain · {market.chainSymbol}</span>
                    </>
                  ) : (
                    <span className="text-muted">market closed — self-priced overnight · {market.chainSymbol}</span>
                  )}
                </div>
              ) : (
                <div className="absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border border-border rounded-md px-1.5 py-0.5 pointer-events-none text-muted">
                  self-priced — the order book is the feed (EMA)
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-between text-[10px] text-muted">
              <span>vol {fmt(isChain ? (liveVol ?? 0) : market.volume24h)}</span>
              <span>resting liquidity {restingLiquidity !== null ? fmt(restingLiquidity) : '—'}</span>
              <span>onchain · usdc</span>
            </div>

            <div className="px-4 py-3 border-t border-border">
              <div className="text-[10px] text-muted uppercase tracking-widest mb-1.5">// about</div>
              <p className="text-xs text-muted leading-relaxed">{market.description}</p>
            </div>
          </div>

          <div className="border border-border rounded-xl bg-panel overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest font-mono">
              {market.sourceType === 'orderbook' ? '// orderbook — this book is the oracle' : '// orderbook'}
            </div>
            <OrderBook price={markPrice} book={book} error={bookError} />
          </div>
        </div>

        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="border border-border rounded-xl bg-panel p-4">
            <BuySell symbol={market.symbol} price={markPrice} />
          </div>
          {chainSymbol && <MarketMeta chainSymbol={chainSymbol} />}
          {chainSymbol && <CreatorFees chainSymbol={chainSymbol} />}
        </div>
      </div>
    </div>
  )
}

// on-chain provenance: which oracle prices it, who created it + collects fees,
// the fee and how it splits. Public info — shown to everyone, not just the creator.
function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right truncate">{children}</span>
    </div>
  )
}

function MarketMeta({ chainSymbol }: { chainSymbol: string }) {
  const [d, setD] = useState<{ oracle?: string; feeBps?: number; creator?: string; creatorBps?: number; protocolBps?: number; selfOracled?: boolean } | null>(null)
  useEffect(() => {
    let off = false
    Promise.all([
      fetch('/api/chain-markets').then(r => r.json()).catch(() => null),
      fetch('/api/fees').then(r => r.json()).catch(() => null),
    ]).then(([cm, fees]) => {
      if (off) return
      const m = cm?.markets?.find((x: { name: string }) => x.name === chainSymbol)
      const f = fees?.markets?.find((x: { symbol: string }) => x.symbol === chainSymbol)
      setD({ oracle: m?.oracle, feeBps: m?.feeBps, creator: f?.creator, creatorBps: f?.creatorBps, protocolBps: f?.protocolBps, selfOracled: m?.selfOracled })
    })
    return () => { off = true }
  }, [chainSymbol])
  if (!d) return null
  const trunc = (s?: string) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : '—')
  const ex = (s: string) => `https://explorer.solana.com/address/${s}`
  const lpBps =
    d.feeBps != null && d.creatorBps != null && d.protocolBps != null
      ? Math.max(0, d.feeBps - d.creatorBps - d.protocolBps)
      : null
  return (
    <div className="border border-border rounded-xl bg-panel p-4 font-mono text-xs">
      <div className="text-[10px] text-muted uppercase tracking-widest mb-2">// details</div>
      <div className="flex flex-col gap-1.5">
        <MetaRow label="pricing">
          {d.selfOracled ? (
            <span className="text-text" title="No external price feed. The price is set by this market's own order book, smoothed as a time-average (EMA) of the traded mark — so no single trade can jump it. Common for pre-IPO and anything with no real-world feed. You're trading pure supply and demand.">
              self-priced <span className="text-muted">· order book (EMA)</span>
            </span>
          ) : (
            <span className="text-text" title="Priced by an external feed (e.g. yfinance). The order book trades around that reference price.">
              external feed
            </span>
          )}
        </MetaRow>
        <MetaRow label="oracle">
          {d.oracle ? <a href={ex(d.oracle)} target="_blank" rel="noreferrer" className="text-accent hover:underline">{trunc(d.oracle)}</a> : '—'}
        </MetaRow>
        <MetaRow label="creator">
          {d.creator ? <a href={ex(d.creator)} target="_blank" rel="noreferrer" className="text-accent hover:underline">{trunc(d.creator)}</a> : '—'}
        </MetaRow>
        <MetaRow label="trade fee">{d.feeBps != null ? `${(d.feeBps / 100).toFixed(2)}%` : '—'}</MetaRow>
        {lpBps != null && (
          <MetaRow label="fee split">
            <span className="text-muted">protocol {d.protocolBps} · creator {d.creatorBps} · LP {lpBps} <span className="opacity-60">bps</span></span>
          </MetaRow>
        )}
      </div>
    </div>
  )
}

interface FeesInfo {
  creator: string | null
  creatorClaimableUsd: number
  treasuryClaimableUsd: number
}

function CreatorFees({ chainSymbol }: { chainSymbol: string }) {
  const { publicKey, signTransaction } = useTradingWallet()
  const [info, setInfo] = useState<FeesInfo | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = () =>
    fetch(`/api/fees-info?symbol=${encodeURIComponent(chainSymbol)}`)
      .then(r => r.json())
      .then(d => { if (typeof d.creatorClaimableUsd === 'number') setInfo(d) })
      .catch(() => {})

  useEffect(() => {
    load()
    const iv = setInterval(load, 20_000)
    return () => clearInterval(iv)
  }, [chainSymbol])

  // only the market's creator sees the fee-claim card
  if (!info || !info.creator || publicKey?.toBase58() !== info.creator) return null
  const claimable = info.creatorClaimableUsd

  // client-signed: server builds the settle+distribute tx with the creator as
  // fee payer, the wallet signs (creator pays their own gas — spam-proof) + submits
  const claim = async () => {
    if (!publicKey || !signTransaction) return
    setClaiming(true)
    setMsg(null)
    try {
      const r = await fetch('/api/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: publicKey.toBase58(), symbol: chainSymbol }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(typeof d.error === 'string' ? d.error : 'claim failed')
      const signed = await signTransaction(Transaction.from(b64ToBytes(d.tx)))
      const sub = await fetch('/api/trade/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx: bytesToB64(signed.serialize()) }),
      })
      const sd = await sub.json()
      if (!sub.ok) throw new Error(typeof sd.error === 'string' ? sd.error : 'submit failed')
      setMsg('✓ fees claimed to your wallet')
      load()
      window.dispatchEvent(new Event('pmxt:trade'))
    } catch (e: unknown) {
      setMsg(`✗ ${e instanceof Error ? e.message : 'claim failed'}`)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="border border-border rounded-xl bg-panel overflow-hidden font-mono">
      <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
        // creator fees · your market
      </div>
      <div className="p-4 flex flex-col gap-3 text-xs">
        <div className="flex justify-between">
          <span className="text-muted">creator</span>
          <span className="text-text">{info.creator.slice(0, 4)}…{info.creator.slice(-4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">claimable</span>
          <span className="text-yes text-sm">${fmtPrice(claimable)}</span>
        </div>
        <button
          onClick={claim}
          disabled={claiming}
          className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-2.5 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {claiming ? 'claiming…' : 'CLAIM FEES'}
        </button>
        <p className="text-[10px] text-muted text-center">
          {msg ?? 'pays the creator + protocol their split, straight to their wallets'}
        </p>
      </div>
    </div>
  )
}

function fmt(num: number) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}b`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}m`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}k`
  return `$${num.toFixed(2)}`
}
