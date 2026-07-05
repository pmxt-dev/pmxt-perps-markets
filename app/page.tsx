'use client'

import { useState } from 'react'
import { MARKETS, CATEGORIES } from '@/lib/data'
import { Market, Category } from '@/lib/types'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All')

  const filteredMarkets = selectedCategory === 'All'
    ? MARKETS
    : MARKETS.filter(m => m.category === selectedCategory)

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-surface/50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold">PMXT</h1>
            <nav className="flex items-center gap-6 text-sm">
              <button className="text-accent-green font-medium">Markets</button>
              <a href="#" className="text-gray-400 hover:text-white">Docs</a>
              <a href="#" className="text-gray-400 hover:text-white">API</a>
              <a href="#" className="text-gray-400 hover:text-white">X (Twitter)</a>
              <a href="#" className="text-gray-400 hover:text-white">Discord</a>
            </nav>
          </div>
          <button className="border border-accent-green text-accent-green px-6 py-2 rounded hover:bg-accent-green hover:text-dark-bg transition">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Markets Section */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-2">Markets</h2>
              <p className="text-gray-400">Browse and launch perp markets across categories.</p>
            </div>

            {/* Category Filter */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as Category)}
                  className={`px-4 py-2 rounded whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'border border-accent-green text-accent-green bg-accent-green/10'
                      : 'border border-dark-border text-gray-400 hover:border-dark-border'
                  }`}
                >
                  {getCategoryIcon(cat)} {cat}
                </button>
              ))}
            </div>

            {/* Markets Table */}
            <div className="border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-surface/50">
                    <th className="px-6 py-4 text-left font-medium text-gray-400">MARKET</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">CATEGORY</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">PRICE</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">24H VOL</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">QI</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">24H CHANGE</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarkets.map((market, idx) => (
                    <tr
                      key={market.id}
                      className={`border-b border-dark-border hover:bg-dark-surface/30 transition ${
                        idx === filteredMarkets.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-green to-accent-green/50" />
                          <div>
                            <div className="font-medium">{market.symbol}</div>
                            <div className="text-xs text-gray-500">{market.asset}</div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-accent-green/10 text-accent-green">
                            {market.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded bg-dark-surface text-xs">
                          {market.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        ${market.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">${formatBigNumber(market.volume24h)}</div>
                        <div className="text-xs text-gray-500">
                          {(market.volume24h / 1e9).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-12 h-6 bg-dark-surface rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className={market.change24h >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                          {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-accent-green border border-accent-green px-4 py-1.5 rounded hover:bg-accent-green hover:text-dark-bg transition">
                          {market.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-400">
              <div>Showing 1-7 of 7 markets</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-dark-border rounded hover:border-accent-green">←</button>
                <button className="px-3 py-1 bg-accent-green text-dark-bg rounded">1</button>
                <button className="px-3 py-1 border border-dark-border rounded hover:border-accent-green">→</button>
              </div>
            </div>

            <div className="mt-4">
              <a href="#" className="text-accent-green text-sm hover:underline">
                View all markets →
              </a>
            </div>
          </div>

          {/* Create Market Panel */}
          <div className="lg:col-span-1">
            <div className="border border-dark-border rounded-lg p-6 bg-dark-surface/50 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">⚡</span>
                <h3 className="text-xl font-bold">Create a new market</h3>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                Launch your perp market in a few simple steps.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">1. Market name</label>
                  <input
                    type="text"
                    placeholder="e.g. ACME-PERP"
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:border-accent-green outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">2. Category</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Crypto', 'Pre-IPO', 'AI', 'Community', 'Index'].map(cat => (
                      <button
                        key={cat}
                        className="px-3 py-1.5 rounded text-xs border border-dark-border hover:border-accent-green"
                      >
                        {getCategoryIcon(cat as Category)} {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                    3. Price source <span className="text-xs text-gray-400">ⓘ</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Plug into PMXT sources or bring your own.
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-2 py-1.5 rounded text-xs border border-accent-green text-accent-green">
                      PMXT Source
                    </button>
                    <button className="flex-1 px-2 py-1.5 rounded text-xs border border-dark-border">
                      Custom API
                    </button>
                    <button className="flex-1 px-2 py-1.5 rounded text-xs border border-dark-border">
                      WebSocket
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Example: <span className="text-accent-green">PMXT: BTC / USD</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    Recommended
                  </div>
                  <button className="text-xs text-accent-green">
                    View all sources →
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                    4. Seed liquidity <span className="text-xs text-gray-400">ⓘ</span>
                  </label>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 rounded text-sm border border-accent-green bg-accent-green/10 text-accent-green">
                      USDC
                    </button>
                    <input
                      type="number"
                      placeholder="10,000"
                      className="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-1.5 text-sm focus:border-accent-green outline-none"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Minimum 1,000 USDC
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    ≈ $10,000.00
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                    5. Creator fee <span className="text-xs text-gray-400">ⓘ</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="20"
                      className="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-1.5 text-sm focus:border-accent-green outline-none"
                    />
                    <div className="px-3 py-1.5 text-sm">%</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    You earn 20% of all trading fees.
                  </div>
                </div>

                <button className="w-full bg-accent-green text-dark-bg py-2.5 rounded font-medium hover:bg-accent-green/90 transition">
                  Review & Launch Market →
                </button>

                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span>🔒</span> You'll confirm in your wallet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border mt-16 py-6">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>v0.01 • Built on PMXT</span>
            <a href="#" className="hover:text-white">📄 Docs</a>
            <a href="#" className="hover:text-white">⚡ API</a>
            <a href="#" className="hover:text-white">𝕏 Twitter</a>
            <a href="#" className="hover:text-white">💬 Discord</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white">✓ Audited</a>
            <a href="#" className="hover:text-white">🔍 Transparency</a>
            <span className="flex items-center gap-1">Status <span className="w-2 h-2 bg-accent-green rounded-full"></span></span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    Crypto: '🪙',
    'Pre-IPO': '🔵',
    AI: '🤖',
    Community: '👥',
    Indices: '📊',
    All: '⭐',
    Index: '📊',
  }
  return icons[category] || '•'
}

function formatBigNumber(num: number) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}
