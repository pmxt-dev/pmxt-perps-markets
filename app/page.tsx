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
      <header className="border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <span className="text-lg font-semibold">PMXT</span>
            <nav className="flex items-center gap-8 text-sm text-gray-400">
              <span className="text-white">Markets</span>
              <a href="#" className="hover:text-gray-300 transition">Docs</a>
              <a href="#" className="hover:text-gray-300 transition">API</a>
            </nav>
          </div>
          <button className="px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded hover:border-gray-500 transition">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-3xl font-semibold mb-3">Markets</h1>
              <p className="text-gray-500">Browse and trade perpetual futures across categories.</p>
            </div>

            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as Category)}
                  className={`px-3.5 py-1.5 text-sm rounded transition ${
                    selectedCategory === cat
                      ? 'bg-accent-primary text-dark-bg font-medium'
                      : 'border border-dark-border text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="px-6 py-4 text-left font-medium text-gray-500 text-xs uppercase">Market</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500 text-xs uppercase">Price</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500 text-xs uppercase">24h Vol</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500 text-xs uppercase">24h Change</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500 text-xs uppercase">Action</th>
                  </tr>
                </thead>
                <tbody divide-y divide-dark-border>
                  {filteredMarkets.map((market) => (
                    <Link
                      key={market.id}
                      href={`/markets/${market.id}`}
                      className="block hover:bg-dark-surface/50 transition cursor-pointer border-b border-dark-border last:border-b-0"
                    >
                      <div className="px-6 py-4 grid grid-cols-5 gap-4 items-center">
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">{market.symbol}</div>
                          <div className="text-xs text-gray-500 truncate">{market.asset}</div>
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
                        <div className="text-right" onClick={(e) => e.preventDefault()}>
                          <button className="px-4 py-1.5 text-sm rounded bg-accent-primary text-dark-bg font-medium hover:opacity-90 transition">
                            Trade
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-gray-500">
              Showing 1-{filteredMarkets.length} of {filteredMarkets.length} markets
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="border border-dark-border rounded-lg p-8 sticky top-8">
              <h3 className="text-lg font-semibold mb-2">Create Market</h3>
              <p className="text-sm text-gray-500 mb-8">
                Launch a new perpetual market with simple setup.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">Market Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ACME-PERP"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Crypto', 'Pre-IPO', 'AI', 'Index'].map(cat => (
                      <button
                        key={cat}
                        className="px-3 py-2 rounded text-sm border border-dark-border text-gray-400 hover:text-gray-300 hover:border-gray-500 transition"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">Price Source</label>
                  <select className="w-full bg-dark-bg border border-dark-border rounded px-3.5 py-2.5 text-sm text-white focus:border-accent-primary outline-none transition">
                    <option>PMXT Source</option>
                    <option>Custom API</option>
                    <option>WebSocket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">Seed Liquidity (USDC)</label>
                  <input
                    type="number"
                    placeholder="10,000"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
                  />
                  <div className="text-xs text-gray-500 mt-2">Minimum 1,000 USDC</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">Creator Fee (%)</label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
                  />
                </div>

                <button className="w-full bg-accent-primary text-dark-bg py-3 rounded font-semibold hover:opacity-90 transition text-sm">
                  Review & Launch
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-dark-border mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between text-xs text-gray-500">
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
