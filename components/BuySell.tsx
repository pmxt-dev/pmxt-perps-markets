'use client'

import { useState } from 'react'

interface BuySellProps {
  symbol: string
  price: number
}

export default function BuySell({ symbol, price }: BuySellProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [size, setSize] = useState('')
  const [leverage, setLeverage] = useState(1)

  const notional = parseFloat(size) * price || 0
  const margin = notional / leverage || 0

  return (
    <div className="border border-gray-700 rounded-lg p-6 bg-black/50">
      <h3 className="text-lg font-semibold mb-6">{side === 'buy' ? 'Buy' : 'Sell'} {symbol}</h3>

      <div className="flex gap-2 mb-8 bg-dark-surface rounded-lg p-1">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 rounded font-medium transition ${
            side === 'buy'
              ? 'bg-accent-primary text-dark-bg'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 rounded font-medium transition ${
            side === 'sell'
              ? 'bg-accent-red text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Entry Price</label>
          <div className="text-3xl font-bold">
            ${price.toLocaleString('en-US', { maximumFractionDigits: 1 })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Size (Contracts)</label>
          <input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="0"
            className="w-full bg-dark-bg border border-gray-700 rounded px-3 py-3 text-base text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
          />
          <div className="text-xs text-gray-500 mt-2">
            Notional: ${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">Leverage</label>
            <span className="text-sm text-accent-primary font-semibold">{leverage}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full cursor-pointer accent-accent-primary"
          />
          <div className="text-xs text-gray-500 mt-2">Max Leverage: 20x</div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Margin Required</label>
          <div className="text-2xl font-bold">
            ${margin.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
          </div>
        </div>

        <button
          className={`w-full py-3 rounded font-semibold transition text-base ${
            side === 'buy'
              ? 'bg-accent-primary hover:opacity-90 text-dark-bg'
              : 'bg-accent-red hover:opacity-90 text-white'
          } ${(!size || margin <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!size || margin <= 0}
        >
          {side === 'buy' ? 'Open Long' : 'Open Short'}
        </button>

        <p className="text-xs text-gray-500 text-center">Connect wallet to trade</p>
      </div>
    </div>
  )
}
