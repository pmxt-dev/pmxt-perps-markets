'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MARKETS } from '@/lib/data'
import Sparkline from '@/components/Sparkline'
import BuySell from '@/components/BuySell'
import OrderBook from '@/components/OrderBook'

export default function MarketDetail() {
  const params = useParams()
  const id = params?.id as string
  const market = MARKETS.find(m => m.id === id)

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

  const up = market.change24h >= 0
  // ponytail: mock oracle = mark * small fixed skew; replace with live feed read
  const oraclePrice = market.price * 1.0018

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
              <div className="min-w-0">
                <div className="text-sm font-medium leading-snug">&gt; {market.symbol}</div>
                <div className="text-xs text-muted mt-1">{market.asset.toLowerCase()} · {market.category.toLowerCase()}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-2xl font-semibold leading-none ${up ? 'text-yes' : 'text-no'}`}>
                  ${market.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
                <div className={`text-[10px] uppercase tracking-wide mt-1 ${up ? 'text-yes' : 'text-no'}`}>
                  {up ? '▲' : '▼'} {up ? '+' : ''}{market.change24h.toFixed(2)}% 24h
                </div>
              </div>
            </div>

            <div className="relative">
              {market.sparkline && <Sparkline data={market.sparkline} isPositive={up} oracle={oraclePrice} />}
              <div className="absolute top-1.5 left-1.5 text-[10px] bg-bg/85 border border-[#ff9f43]/40 rounded-md px-1.5 py-0.5 pointer-events-none">
                <span className="text-[#ff9f43]">— oracle ${oraclePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                <span className="text-muted ml-1.5">
                  {market.sourceType === 'yfinance' ? `yfinance · ${market.sourceTicker}` : 'self (orderbook)'}
                </span>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-between text-[10px] text-muted">
              <span>vol {fmt(market.volume24h)}</span>
              <span>oi {fmt(market.qi)}</span>
              <span>onchain · usdc</span>
            </div>
          </div>

          <div className="border border-border rounded-xl bg-panel overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-widest font-mono">
              {market.sourceType === 'orderbook' ? '// orderbook — this book is the oracle' : '// orderbook'}
            </div>
            <OrderBook price={market.price} />
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="border border-border rounded-xl bg-panel p-4 sticky top-20">
            <BuySell symbol={market.symbol} price={market.price} />
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
