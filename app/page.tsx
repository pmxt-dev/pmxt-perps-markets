'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MARKETS, CATEGORIES } from '@/lib/data'
import { fmtPrice } from '@/lib/format'
import { Category, Market } from '@/lib/types'
import { catalogToMarket, CatalogEntry } from '@/lib/catalog'
import { useTradingWallet } from '@/lib/useTradingWallet'
import Sparkline from '@/components/Sparkline'
import { Transaction } from '@solana/web3.js'

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
const bytesToB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// protocol always takes this cut of the trading fee; creator picks their share
// of the rest, liquidity providers (makers) get whatever's left
const PROTOCOL_FEE_PCT = 30

interface LiveQuote {
  price: number
  change: number | null
  closes?: number[]
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All')
  const [live, setLive] = useState<Record<string, LiveQuote>>({})
  const [extra, setExtra] = useState<Market[]>([])
  const [chainError, setChainError] = useState<string | null>(null)

  // list must show the same live price the detail page shows — mock values only remain
  // for orderbook (self-oracle) markets and as a fallback while quotes load
  useEffect(() => {
    let cancelled = false
    const loadAll = () => {
      MARKETS.forEach(m => {
        if (m.sourceType !== 'yfinance' || !m.sourceTicker) return
        fetch(`/api/yf-price?symbol=${encodeURIComponent(m.sourceTicker)}`)
          .then(r => r.json())
          .then(d => {
            if (cancelled || typeof d.price !== 'number') return
            setLive(prev => ({
              ...prev,
              [m.id]: {
                price: d.price,
                change: typeof d.change === 'number' ? d.change : null,
                closes: Array.isArray(d.closes) && d.closes.length >= 2 ? d.closes : undefined,
              },
            }))
          })
          .catch(() => {})
      })
      // onchain markets: mark price (book-driven) from the deployed chain
      fetch('/api/chain-markets')
        .then(async r => {
          const d = await r.json()
          if (cancelled) return
          if (!r.ok || !Array.isArray(d.markets)) {
            setChainError(typeof d.error === 'string' ? d.error : 'chain feed unreachable')
            return
          }
          setChainError(null)
          const bySymbol = new Map<string, number>(
            d.markets.map((cm: { name: string; markPrice: number }) => [cm.name, cm.markPrice]),
          )
          setLive(prev => {
            const next = { ...prev }
            MARKETS.forEach(m => {
              if (m.sourceType !== 'onchain' || !m.chainSymbol) return
              const price = bySymbol.get(m.chainSymbol)
              if (typeof price === 'number') next[m.id] = { ...next[m.id], price, change: next[m.id]?.change ?? null }
            })
            return next
          })
          // sparklines from the recorded mark-price series (all-time, like the
          // detail page's default view)
          MARKETS.forEach(m => {
            if (m.sourceType !== 'onchain' || !m.chainSymbol) return
            fetch(`/api/chain-history?symbol=${encodeURIComponent(m.chainSymbol)}&tf=all`)
              .then(async r => {
                const h = await r.json()
                if (cancelled || !r.ok || !Array.isArray(h.points)) return
                const closes = h.points
                  .map((pt: { p: number }) => pt.p)
                  .filter((p: unknown): p is number => typeof p === 'number')
                if (closes.length < 2) return
                const change = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
                setLive(prev => ({
                  ...prev,
                  [m.id]: { price: closes[closes.length - 1], change, closes },
                }))
              })
              .catch(() => {})
          })
        })
        .catch(e => {
          if (!cancelled) setChainError(e instanceof Error ? e.message : 'chain feed unreachable')
        })
      // full catalog — surfaces markets deployed at runtime (volume/liquidity
      // travel on each entry via catalogToMarket)
      fetch('/api/catalog')
        .then(async r => {
          const d = await r.json()
          if (cancelled || !r.ok || !Array.isArray(d.markets)) return
          const entries = d.markets as CatalogEntry[]
          setExtra(entries.map(catalogToMarket))
          // sparkline for every on-chain market (incl. deployed) from its history
          for (const m of entries) {
            const id = m.name.toLowerCase()
            if (MARKETS.some(sm => sm.id === id)) continue // static ones already handled
            fetch(`/api/chain-history?symbol=${encodeURIComponent(m.name)}&tf=all`)
              .then(async hr => {
                const h = await hr.json()
                if (cancelled || !hr.ok || !Array.isArray(h.points)) return
                const closes = h.points
                  .map((pt: { p: number }) => pt.p)
                  .filter((p: unknown): p is number => typeof p === 'number')
                if (closes.length < 2) return
                const change = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
                setLive(prev => ({ ...prev, [id]: { price: closes[closes.length - 1], change, closes } }))
              })
              .catch(() => {})
          }
        })
        .catch(() => {})
    }
    loadAll()
    const iv = setInterval(loadAll, 8_000)
    // a trade anywhere refreshes the list immediately
    const onTrade = () => loadAll()
    window.addEventListener('pmxt:trade', onTrade)
    return () => { cancelled = true; clearInterval(iv); window.removeEventListener('pmxt:trade', onTrade) }
  }, [])

  // static markets + any deployed at runtime (from the chain catalog)
  const staticSymbols = new Set(MARKETS.map(m => m.chainSymbol).filter(Boolean))
  const allMarkets = [...MARKETS, ...extra.filter(m => !staticSymbols.has(m.chainSymbol))]
  const filteredMarkets = selectedCategory === 'All'
    ? allMarkets
    : allMarkets.filter(m => m.category === selectedCategory)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 flex flex-col gap-4">
        <div>
          <h1 className="font-mono text-lg text-text">&gt; markets</h1>
          <p className="font-mono text-xs text-muted mt-1">browse and launch perp markets across categories</p>
        </div>

        <div className="flex flex-wrap gap-1.5 font-mono">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as Category)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition ${
                selectedCategory === cat
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'border-border text-muted hover:text-text hover:border-muted'
              }`}
            >
              {cat.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-xl bg-panel overflow-hidden font-mono">
          <h2 className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
            // {selectedCategory === 'All' ? 'all markets' : selectedCategory.toLowerCase()} ({filteredMarkets.length})
            {chainError && (
              <span className="ml-3 normal-case tracking-normal text-no">
                ✗ chain feed: {chainError} — onchain prices may be stale
              </span>
            )}
          </h2>
          <div className="divide-y divide-border/50">
            {filteredMarkets.map((market) => {
              const quote = live[market.id]
              const price = quote?.price ?? market.price
              const change = quote?.change ?? market.change24h
              const sparkData = quote?.closes ?? market.sparkline
              const up = change >= 0
              return (
                <Link
                  key={market.id}
                  href={`/perps/${market.id}`}
                  className="flex items-center gap-4 px-4 py-3 text-xs hover:bg-white/[0.03] transition"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    {market.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={market.thumbnail}
                        alt={market.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-text text-sm">{market.symbol}</div>
                      <div className="text-[10px] text-muted truncate mt-0.5">{market.asset.toLowerCase()}</div>
                    </div>
                  </div>
                  <div className="w-24 shrink-0 hidden sm:block opacity-70">
                    {sparkData && <Sparkline data={sparkData} isPositive={up} />}
                  </div>
                  <div className="text-right shrink-0 w-24">
                    <div className="text-text">${fmtPrice(price)}</div>
                    <div className={`text-[10px] mt-0.5 ${up ? 'text-yes' : 'text-no'}`}>
                      {up ? '▲' : '▼'} {up ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20 hidden sm:block">
                    <div className="text-muted">{market.volume24h != null ? fmt(market.volume24h) : '—'}</div>
                    <div className="text-[10px] text-muted mt-0.5">volume</div>
                  </div>
                  <span className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-accent/40 text-accent">
                    trade
                  </span>
                </Link>
              )
            })}
            {filteredMarkets.length === 0 && (
              <div className="px-4 py-3 text-[10px] text-muted">no markets in this category</div>
            )}
          </div>
        </div>

        <div className="font-mono text-[10px] text-muted">
          showing 1–{filteredMarkets.length} of {filteredMarkets.length} markets
        </div>
      </div>

      <div className="md:col-span-1">
        <CreateMarket />
      </div>
    </div>
  )
}

interface YfAsset {
  symbol: string
  name: string
  exchange: string
  type: string
}

function CreateMarket() {
  const { publicKey, signTransaction } = useTradingWallet()
  const [priceSource, setPriceSource] = useState('yfinance')
  const [category, setCategory] = useState('crypto')
  const [customCategory, setCustomCategory] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [thumbError, setThumbError] = useState(false)
  const [feeBpsStr, setFeeBpsStr] = useState('100')
  const [creatorFeeStr, setCreatorFeeStr] = useState('20')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<YfAsset[]>([])
  const [asset, setAsset] = useState<YfAsset | null>(null)
  const [searching, setSearching] = useState(false)
  const [seedStr, setSeedStr] = useState('')
  const [nameStr, setNameStr] = useState('')
  const [descStr, setDescStr] = useState('')
  const [listingPriceStr, setListingPriceStr] = useState('')
  const [deploying, setDeploying] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deployed, setDeployed] = useState<string | null>(null)
  const [solUsd, setSolUsd] = useState<number | null>(null)

  // live SOL price so the ~2.5 SOL orderbook rent shows in USD (it moves over time)
  useEffect(() => {
    fetch('/api/sol-price').then(r => r.json()).then(d => { if (typeof d.usd === 'number') setSolUsd(d.usd) }).catch(() => {})
  }, [])

  const seed = parseFloat(seedStr) || 0
  const seedTooLow = seedStr !== '' && seed < 100
  const isSelf = priceSource === 'orderbook'
  const listingPrice = parseFloat(listingPriceStr) || 0

  // free-form fee inputs: never rewrite what the user typed, just flag out-of-bounds
  const feeBps = /^\d+$/.test(feeBpsStr.trim()) ? parseInt(feeBpsStr.trim(), 10) : NaN
  const feeBpsError = feeBpsStr.trim() !== '' && (isNaN(feeBps) || feeBps < 1 || feeBps > 1000)
  const creatorFee = /^\d+$/.test(creatorFeeStr.trim()) ? parseInt(creatorFeeStr.trim(), 10) : NaN
  const creatorFeeError = creatorFeeStr.trim() !== '' && (isNaN(creatorFee) || creatorFee > 50)
  const feesIncomplete = feeBpsStr.trim() === '' || creatorFeeStr.trim() === ''

  const canDeploy =
    nameStr.trim() !== '' && !seedTooLow && seed >= 100 &&
    (isSelf ? listingPrice > 0 : asset !== null) &&
    !feeBpsError && !creatorFeeError && !feesIncomplete && deploying === null

  // client-signed create: prepare (server plumbing → unsigned tx) → the creator
  // signs (their USDC funds the seed) → submit → finalize (server seeds the book)
  const onDeploy = async () => {
    if (!publicKey || !signTransaction) { setDeployError('connect a wallet first'); return }
    setDeployError(null)
    setDeployed(null)
    try {
      setDeploying('preparing…')
      const prep = await fetch('/api/deploy/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameStr,
          description: descStr,
          category: category === 'other' ? customCategory : category,
          priceSource,
          sourceTicker: isSelf ? undefined : asset?.symbol,
          initialPrice: isSelf ? listingPrice : undefined,
          seedUsdc: seed,
          thumbnail: thumbnailUrl || undefined,
          feeBps,
          creatorFeePct: creatorFee,
          owner: publicKey.toBase58(),
        }),
      })
      const pd = await prep.json()
      if (!prep.ok) throw new Error(typeof pd.error === 'string' ? pd.error : 'deploy failed')
      const submit = async (txB64: string) => {
        const signed = await signTransaction(Transaction.from(b64ToBytes(txB64)))
        const sub = await fetch('/api/trade/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx: bytesToB64(signed.serialize()) }),
        })
        const sd = await sub.json()
        if (!sub.ok) throw new Error(typeof sd.error === 'string' ? sd.error : 'submit failed')
      }
      // 1/2 — fund the order book (you pay the ~2.5 SOL rent). /submit waits for
      // confirmation, so the accounts exist before the create tx initializes them.
      setDeploying('sign 1/2 — fund the order book…')
      await submit(pd.tx)
      // 2/2 — create the market. The server rebuilds this tx with a FRESH blockhash
      // (and fresh oracle) right now, so this second prompt can't expire while you
      // were deciding on the first.
      setDeploying('sign 2/2 — create the market…')
      const cr = await fetch('/api/deploy/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pd.pending),
      })
      const cd = await cr.json()
      if (!cr.ok) throw new Error(typeof cd.error === 'string' ? cd.error : 'create failed')
      await submit(cd.tx)
      setDeploying('seeding the book…')
      const fin = await fetch('/api/deploy/finalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pd.pending, oracle: cd.oracle }),
      })
      const fd = await fin.json()
      if (!fin.ok) throw new Error(typeof fd.error === 'string' ? fd.error : 'finalize failed')
      setDeployed(fd.name)
      setNameStr(''); setDescStr(''); setSeedStr(''); setListingPriceStr(''); setAsset(null)
      window.dispatchEvent(new Event('pmxt:trade')) // triggers list refetch
    } catch (e: unknown) {
      setDeployError(e instanceof Error ? e.message : 'deploy failed')
    } finally {
      setDeploying(null)
    }
  }

  // a new thumbnail url gets a fresh chance to load (clears any prior error)
  useEffect(() => { setThumbError(false) }, [thumbnailUrl])

  // when a yfinance asset is picked, auto-fill the description and thumbnail
  // from Yahoo's company profile — but never overwrite what the user typed
  useEffect(() => {
    if (priceSource !== 'yfinance' || !asset) return
    const needsDesc = descStr.trim() === ''
    const needsThumb = thumbnailUrl.trim() === ''
    if (!needsDesc && !needsThumb) return
    let cancelled = false
    fetch(`/api/yf-profile?symbol=${encodeURIComponent(asset.symbol)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (needsDesc) {
          setDescStr(
            typeof d.description === 'string' && d.description.trim()
              ? d.description.trim()
              : `perpetual future on ${asset.name.toLowerCase()} (${asset.symbol}), priced via yfinance.`,
          )
        }
        if (needsThumb && typeof d.logo === 'string' && d.logo) setThumbnailUrl(d.logo)
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, priceSource])

  useEffect(() => {
    if (priceSource !== 'yfinance' || !query.trim() || asset) {
      setResults([])
      return
    }
    setSearching(true)
    const id = setTimeout(() => {
      fetch(`/api/yf-search?q=${encodeURIComponent(query.trim())}`)
        .then(r => r.json())
        .then(d => setResults(d.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => { clearTimeout(id); setSearching(false) }
  }, [query, priceSource, asset])

  return (
    <aside className="border border-border rounded-xl bg-panel overflow-hidden font-mono sticky top-20">
      <h2 className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
        // create market
      </h2>
      <div className="p-4 flex flex-col gap-4 text-xs">
        <Field label="market name">
          <input
            type="text"
            value={nameStr}
            onChange={(e) => setNameStr(e.target.value)}
            placeholder="ACME-PERP"
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition"
          />
        </Field>

        <Field label="description">
          <textarea
            rows={3}
            value={descStr}
            onChange={(e) => setDescStr(e.target.value)}
            placeholder="what does this market track, and where does its price come from?"
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition resize-none"
          />
        </Field>

        <Field label="thumbnail (image url)">
          <div className="flex items-center gap-2.5">
            {thumbnailUrl.trim() && !thumbError && (
              <img
                src={thumbnailUrl}
                alt=""
                className="w-9 h-9 rounded-md object-cover shrink-0 border border-border bg-bg"
                onError={() => setThumbError(true)}
                onLoad={() => setThumbError(false)}
              />
            )}
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://… square image shown next to the name"
              className="flex-1 min-w-0 bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition"
            />
          </div>
          {thumbnailUrl.trim() && thumbError && (
            <p className="text-[10px] text-no mt-1.5">✗ couldn&apos;t load an image from this link — check the url points directly to an image (jpg/png/svg/webp)</p>
          )}
        </Field>

        <Field label="category">
          <div className="flex flex-wrap gap-1.5">
            {['crypto', 'pre-ipo', 'ai', 'index', 'other'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-md border transition ${
                  category === cat
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-border text-muted hover:text-text hover:border-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {category === 'other' && (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="your category — community, sports, elections…"
              className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition"
            />
          )}
        </Field>

        <Field
          label="oracle source"
          hint={priceSource === 'orderbook' ? 'self-priced: no external feed — the price is this market’s own order book, time-averaged (EMA) so a single trade can’t move it. for pre-ipo and anything without a real-world feed. pure supply/demand — trade at your own risk.' : undefined}
        >
          <select
            value={priceSource}
            onChange={(e) => setPriceSource(e.target.value)}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text outline-none focus:border-muted transition"
          >
            <option value="yfinance">yfinance</option>
            <option value="orderbook">orderbook (self-oracle)</option>
            <option value="custom-api" disabled>custom api — coming soon</option>
          </select>
        </Field>

        {priceSource === 'yfinance' && (
          <Field label="asset">
            {asset ? (
              <div className="flex items-center justify-between rounded-md border border-accent/40 bg-accent/5 px-3 py-2">
                <div className="min-w-0">
                  <span className="text-accent text-sm">{asset.symbol}</span>
                  <span className="text-muted text-[11px] ml-2 truncate">{asset.name}</span>
                </div>
                <button
                  onClick={() => { setAsset(null); setQuery('') }}
                  className="text-muted hover:text-no transition ml-2 shrink-0"
                  aria-label="clear asset"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search ticker or name — AAPL, bitcoin…"
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition"
                />
                {(results.length > 0 || searching) && query.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 border border-border rounded-md bg-panel overflow-hidden max-h-56 overflow-y-auto">
                    {searching && results.length === 0 && (
                      <div className="px-3 py-2 text-[11px] text-muted">searching…</div>
                    )}
                    {results.map((r) => (
                      <button
                        key={r.symbol}
                        onClick={() => { setAsset(r); setResults([]) }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.03] transition"
                      >
                        <span className="text-text text-sm">{r.symbol}</span>
                        <span className="text-muted text-[10px] truncate ml-3">
                          {r.name}{r.exchange ? ` · ${r.exchange.toLowerCase()}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>
        )}

        {isSelf && (
          <Field label="listing price (usd)" hint="the price this market opens at — the seed book is placed around it">
            <input
              type="number"
              min={0}
              step="any"
              value={listingPriceStr}
              onChange={(e) => setListingPriceStr(e.target.value)}
              placeholder="1.00"
              className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition"
            />
          </Field>
        )}

        <Field label="seed liquidity (usdc)">
          <input
            type="number"
            min={100}
            value={seedStr}
            onChange={(e) => setSeedStr(e.target.value)}
            placeholder="100"
            className={`w-full bg-bg border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none transition ${
              seedTooLow ? 'border-no focus:border-no' : 'border-border focus:border-muted'
            }`}
          />
          <span className={`text-[10px] ${seedTooLow ? 'text-no' : 'text-muted'}`}>
            {seedTooLow ? `✗ minimum 100 usdc — you entered $${seed}` : 'minimum 100 usdc'}
          </span>
          <span className="block text-[10px] text-muted mt-1">
            + ~2.5 SOL{solUsd ? ` (≈ $${Math.round(2.5 * solUsd)})` : ''} for the on-chain orderbook — paid from your wallet, refundable when you close the market
          </span>
        </Field>

        <Field label="fees">
          <div className="rounded-md border border-border bg-bg px-3 py-2.5 flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">
                trading fee{' '}
                {!isNaN(feeBps) && !feeBpsError && <span className="text-text">{(feeBps / 100).toFixed(2)}%</span>}
              </span>
              <div className="relative shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={feeBpsStr}
                  onChange={(e) => setFeeBpsStr(e.target.value)}
                  placeholder="100"
                  className={`w-20 bg-panel border rounded-md pl-2 pr-9 py-1 text-right text-text placeholder-muted/50 outline-none transition ${
                    feeBpsError ? 'border-no focus:border-no' : 'border-border focus:border-muted'
                  }`}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted">bps</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">protocol fee</span>
              <span className="text-text">{PROTOCOL_FEE_PCT}% of trading fees · fixed</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">creator fee</span>
              <div className="relative shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={creatorFeeStr}
                  onChange={(e) => setCreatorFeeStr(e.target.value)}
                  placeholder="20"
                  className={`w-16 bg-panel border rounded-md pl-2 pr-6 py-1 text-right text-text placeholder-muted/50 outline-none transition ${
                    creatorFeeError ? 'border-no focus:border-no' : 'border-border focus:border-muted'
                  }`}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted">%</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">liquidity providers</span>
              <span className="text-text">{!isNaN(creatorFee) && !creatorFeeError ? `${100 - PROTOCOL_FEE_PCT - creatorFee}%` : '—'}</span>
            </div>
          </div>
          {feeBpsError ? (
            <span className="text-[10px] text-no">✗ trading fee must be a whole number between 1 and 1000 bps</span>
          ) : creatorFeeError ? (
            <span className="text-[10px] text-no">✗ creator fee must be a whole number between 0 and 50%</span>
          ) : (
            <span className="text-[10px] text-muted">trading fee is charged per trade (100 bps = 1%, the standard) and split protocol / creator / lps; creator share max 50%</span>
          )}
        </Field>

        <button
          onClick={onDeploy}
          disabled={!canDeploy || feeBpsError || creatorFeeError || feesIncomplete}
          className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {deploying ?? 'LAUNCH MARKET'}
        </button>
        {deployError && <p className="text-[10px] text-no text-center">✗ {deployError}</p>}
        {deployed && <p className="text-[10px] text-yes text-center">✓ {deployed} is live — it&apos;ll appear in the list</p>}
        {!deployError && !deployed && (
          <p className="text-[10px] text-muted text-center">deploys on-chain, seeds the book, and lists it live</p>
        )}
      </div>
    </aside>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-muted uppercase tracking-widest">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </div>
  )
}

function fmt(num: number) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}b`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}m`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}k`
  return `$${num.toFixed(2)}`
}
