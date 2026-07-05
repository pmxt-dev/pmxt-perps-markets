'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MARKETS, CATEGORIES } from '@/lib/data'
import { Category } from '@/lib/types'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All')

  const filteredMarkets = selectedCategory === 'All'
    ? MARKETS
    : MARKETS.filter(m => m.category === selectedCategory)

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="border-b border-dark-border bg-dark-bg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-xl font-semibold tracking-tight">PMXT</h1>
            <nav className="flex items-center gap-8 text-sm">
              <span className="text-white font-medium">Markets</span>
              <a href="#" className="text-gray-400 hover:text-gray-300 transition">Docs</a>
              <a href="#" className="text-gray-400 hover:text-gray-300 transition">API</a>
            </nav>
          </div>
          <button className="px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded hover:border-gray-400 hover:text-white transition">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h2 className="text-3xl font-semibold tracking-tight mb-2">Markets</h2>
              <p className="text-gray-500">Browse and trade perpetual futures across categories.</p>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as Category)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-accent-primary text-dark-bg font-medium'
                      : 'border border-dark-border text-gray-400 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="border border-dark-border rounded-lg overflow-hidden bg-dark-surface/40">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border bg-dark-surface/60">
                      <th className="px-6 py-4 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">Market</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">Price</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">24h Vol</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">24h Change</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarkets.map((market, idx) => (
                      <Link
                        key={market.id}
                        href={`/markets/${market.id}`}
                        className="block border-b border-dark-border hover:bg-dark-surface/60 transition cursor-pointer"
                      >
                        <div className="px-6 py-4 grid grid-cols-5 gap-4 items-center">
                          <div>
                            <div className="font-medium text-white">{market.symbol}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{market.asset}</div>
                          </div>
                          <div className="text-white font-medium">
                            ${market.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-gray-400">
                            ${formatBigNumber(market.volume24h)}
                          </div>
                          <div className={`font-medium ${market.change24h >= 0 ? 'text-accent-primary' : 'text-accent-red'}`}>
                            {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                          </div>
                          <div onClick={(e) => e.preventDefault()}>
                            <button className="px-3 py-1.5 text-sm rounded bg-accent-primary text-dark-bg font-medium hover:opacity-90 transition">
                              Trade
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
              <div>Showing 1-{filteredMarkets.length} of {filteredMarkets.length} markets</div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="border border-dark-border rounded-lg p-6 bg-dark-surface/40 sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Create Market</h3>
              <p className="text-sm text-gray-500 mb-6">
                Launch a new perpetual market with simple setup.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Market Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ACME-PERP"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Crypto', 'Pre-IPO', 'AI', 'Index'].map(cat => (
                      <button
                        key={cat}
                        className="px-3 py-2 rounded text-xs border border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-300 transition"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price Source</label>
                  <select className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white focus:border-accent-primary outline-none transition">
                    <option>PMXT Source</option>
                    <option>Custom API</option>
                    <option>WebSocket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Seed Liquidity (USDC)</label>
                  <input
                    type="number"
                    placeholder="10,000"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
                  />
                  <div className="text-xs text-gray-500 mt-1">Minimum 1,000 USDC</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Creator Fee (%)</label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
                  />
                </div>

                <button className="w-full bg-accent-primary text-dark-bg py-2.5 rounded font-medium hover:opacity-90 transition text-sm">
                  Review & Launch
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-dark-border mt-16 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-6">
            <span>v0.01 • Built on PMXT</span>
            <a href="#" className="hover:text-gray-400 transition">Docs</a>
            <a href="#" className="hover:text-gray-400 transition">API</a>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-400 transition">Audited</a>
            <a href="#" className="hover:text-gray-400 transition">Transparency</a>
            <span className="flex items-center gap-2">Status <span className="w-1.5 h-1.5 bg-accent-primary rounded-full"></span></span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function formatBigNumber(num: number) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return `${num.toFixed(2)}`
}
