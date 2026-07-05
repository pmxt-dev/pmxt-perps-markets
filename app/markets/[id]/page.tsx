'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MARKETS } from '@/lib/data'
import { fmtPrice } from '@/lib/format'
import Sparkline from '@/components/Sparkline'
import BuySell from '@/components/BuySell'
import OrderBook, { BookData } from '@/components/OrderBook'

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
}

export default function MarketDetail() {
  const params = useParams()
  const id = params?.id as string
  const market = MARKETS.find(m => m.id === id)
  const [liveOracle, setLiveOracle] = useState<number | null>(null)
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
    const iv = setInterval(() => { load(); loadHistory(); loadBook() }, 15_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [chainSymbol, refreshTick])

  if (!market) {
    return (
      <div className="font-mono text-sm">
        <div className="text-no">✗ market not found</div>
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
  // onchain markets: mark = oracle (stub oracle drives the market until the book takes over)
  const oraclePrice = isChain ? (liveOracle ?? market.price) : (liveOracle ?? market.price * 1.0018)
  const markPrice = isChain ? (liveOracle ?? market.price) : liveOracle ? liveOracle / 1.0018 : market.price
  // onchain markets: chart = the recorded oracle series, windowed by the selected timeframe
  const chainCloses = (() => {
    if (!isChain || !chainPoints) return null
    const windowed = chainTf === 'all'
      ? chainPoints
      : chainPoints.filter(pt => pt.t >= Date.now() - CHAIN_TF_MS[chainTf])
    return windowed.length >= 2 ? windowed.map(pt => pt.p) : chainPoints.map(pt => pt.p)
  })()

  // yfinance markets: chart = real history (mark = oracle / skew), oracle drawn as line series.
  // onchain markets: chart = the oracle series itself, sampled from the chain (mark = oracle).
  // orderbook markets: static mock walk, no external oracle to overlay.
  const chartData = isYf && history
    ? history.map((p) => p / 1.0018)
    : chainCloses
      ? chainCloses
      : market.sparkline?.map((p) => p * (markPrice / market.price))
  // chain markets: mark = oracle, so the orange oracle line traces the mosaic's top edge.
  // self-oracled markets get no oracle line — their stub oracle is a protocol
  // placeholder, not a price feed, and drawing it would misrepresent the market.
  const oracleSeries = isYf && history
    ? history
    : isChain && !market.selfOracled
      ? chainCloses ?? undefined
      : undefined
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
                    <span className="text-muted">self-oracled — the orderbook is the price feed · pmxt chain</span>
                  )}
                </div>
              ) : isChain ? (
                <div className="absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border border-yes/40 rounded-md px-1.5 py-0.5 pointer-events-none">
                  {chainError ? (
                    <span className="text-no">✗ chain feed: {chainError}</span>
                  ) : (
                    <>
                      <span className="text-yes">— oracle ${fmtPrice(oraclePrice)}</span>
                      <span className="text-muted ml-1.5">pmxt chain · {market.chainSymbol}</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border border-border rounded-md px-1.5 py-0.5 pointer-events-none text-muted">
                  self-oracled — the orderbook is the price feed
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-between text-[10px] text-muted">
              <span>vol {fmt(market.volume24h)}</span>
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

        <div className="md:col-span-1">
          <div className="border border-border rounded-xl bg-panel p-4 sticky top-20">
            <BuySell symbol={market.symbol} price={markPrice} />
          </div>
        </div>
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
