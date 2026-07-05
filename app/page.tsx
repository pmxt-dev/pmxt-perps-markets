'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MARKETS, CATEGORIES } from '@/lib/data'
import { Category } from '@/lib/types'
import Sparkline from '@/components/Sparkline'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All')

  const filteredMarkets = selectedCategory === 'All'
    ? MARKETS
    : MARKETS.filter(m => m.category === selectedCategory)

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
          <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
            // {selectedCategory === 'All' ? 'all markets' : selectedCategory.toLowerCase()} ({filteredMarkets.length})
          </div>
          <div className="divide-y divide-border/50">
            {filteredMarkets.map((market) => {
              const up = market.change24h >= 0
              return (
                <Link
                  key={market.id}
                  href={`/markets/${market.id}`}
                  className="flex items-center gap-4 px-4 py-3 text-xs hover:bg-white/[0.03] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-text text-sm">{market.symbol}</div>
                    <div className="text-[10px] text-muted truncate mt-0.5">{market.asset.toLowerCase()}</div>
                  </div>
                  <div className="w-24 shrink-0 hidden sm:block opacity-70">
                    {market.sparkline && <Sparkline data={market.sparkline} isPositive={up} />}
                  </div>
                  <div className="text-right shrink-0 w-24">
                    <div className="text-text">${market.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                    <div className={`text-[10px] mt-0.5 ${up ? 'text-yes' : 'text-no'}`}>
                      {up ? '▲' : '▼'} {up ? '+' : ''}{market.change24h.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20 hidden sm:block">
                    <div className="text-muted">{fmt(market.volume24h)}</div>
                    <div className="text-[10px] text-muted mt-0.5">24h vol</div>
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
  const [priceSource, setPriceSource] = useState('yfinance')
  const [creatorFee, setCreatorFee] = useState(20)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<YfAsset[]>([])
  const [asset, setAsset] = useState<YfAsset | null>(null)
  const [searching, setSearching] = useState(false)
  const [seedStr, setSeedStr] = useState('')

  const seed = parseFloat(seedStr) || 0
  const seedTooLow = seedStr !== '' && seed < 100

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
      <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest">
        // create market
      </div>
      <div className="p-4 flex flex-col gap-4 text-xs">
        <Field label="market name">
          <input
            type="text"
            placeholder="ACME-PERP"
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted/50 outline-none focus:border-muted transition"
          />
        </Field>

        <Field label="category">
          <div className="flex flex-wrap gap-1.5">
            {['crypto', 'pre-ipo', 'ai', 'index'].map(cat => (
              <button
                key={cat}
                className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted hover:text-text hover:border-muted transition"
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="price source"
          hint={priceSource === 'orderbook' ? 'no external oracle — the market’s own orderbook is the price. for pre-ipo and anything without a feed. trade at your own risk.' : undefined}
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
        </Field>

        <Field label="fees">
          <div className="rounded-md border border-border bg-bg px-3 py-2.5 flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted">protocol fee</span>
              <span className="text-text">30% of trading fees · fixed</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">creator fee</span>
              <div className="relative shrink-0">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={creatorFee}
                  onChange={(e) => setCreatorFee(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                  className="w-16 bg-panel border border-border rounded-md pl-2 pr-6 py-1 text-right text-text outline-none focus:border-muted transition"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted">%</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">liquidity providers</span>
              <span className="text-text">{70 - creatorFee}%</span>
            </div>
          </div>
          <span className="text-[10px] text-muted">creator fee is your share of trading fees, max 50%</span>
        </Field>

        <button
          disabled={seedTooLow || seed === 0}
          className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed"
        >
          REVIEW &amp; LAUNCH
        </button>
        <p className="text-[10px] text-muted text-center">you&apos;ll confirm in your wallet</p>
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
