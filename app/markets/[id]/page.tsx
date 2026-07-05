'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MARKETS } from '@/lib/data'
import Sparkline from '@/components/Sparkline'
import BuySell from '@/components/BuySell'

export default function MarketDetail() {
  const params = useParams()
  const id = params?.id as string
  const market = MARKETS.find(m => m.id === id)

  if (!market) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Market not found</h1>
          <Link href="/" className="text-accent-primary hover:text-accent-primary/80 transition">
            Back to Markets
          </Link>
        </div>
      </div>
    )
  }

  const isPositive = market.change24h >= 0

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="border-b border-dark-border">
        <div className="mx-auto px-8 py-5 flex items-center justify-between" style={{ maxWidth: '80rem' }}>
          <div className="flex items-center gap-10">
            <span className="text-lg font-semibold">PMXT</span>
            <nav className="flex items-center gap-8 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-300 transition">Markets</Link>
              <a href="#" className="hover:text-gray-300 transition">Docs</a>
            </nav>
          </div>
          <button className="px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded hover:border-gray-500 transition">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="mx-auto px-8 py-10" style={{ maxWidth: '80rem', width: '100%' }}>
        <Link href="/" className="text-accent-primary hover:text-accent-primary/80 transition text-sm mb-10 inline-block">
          Back to Markets
        </Link>

        <div className="grid grid-cols-3 gap-10">
          <div className="col-span-2 space-y-10">
            <div className="border border-dark-border rounded-lg p-10">
              <div className="mb-10">
                <h1 className="text-4xl font-semibold mb-2">{market.symbol}</h1>
                <p className="text-gray-500">{market.asset}</p>
              </div>

              <div className="mb-12">
                <div className="text-5xl font-semibold mb-3">
                  ${market.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
                <div className={`text-lg font-medium ${isPositive ? 'text-accent-primary' : 'text-accent-red'}`}>
                  {isPositive ? '+' : ''}{market.change24h.toFixed(2)}% (24h)
                </div>
              </div>

              <div className="mb-12 p-8 bg-dark-bg rounded border border-dark-border">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-6">24h Price Chart</div>
                {market.sparkline && (
                  <div className="h-40 flex items-center justify-center -mx-4">
                    <Sparkline
                      data={market.sparkline}
                      width={600}
                      height={140}
                      isPositive={isPositive}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-dark-bg rounded border border-dark-border">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">24h Volume</div>
                  <div className="text-2xl font-semibold">
                    ${(market.volume24h / 1e9).toFixed(2)}B
                  </div>
                </div>
                <div className="p-6 bg-dark-bg rounded border border-dark-border">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">OI</div>
                  <div className="text-2xl font-semibold">
                    ${(market.qi / 1e6).toFixed(2)}M
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="sticky top-8">
              <BuySell symbol={market.symbol} price={market.price} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
