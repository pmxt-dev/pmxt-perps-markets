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
    <div className="border border-dark-border rounded-lg p-8">
      <h3 className="text-lg font-semibold mb-8">{side === 'buy' ? 'Buy' : 'Sell'} {symbol}</h3>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-3 rounded font-medium transition text-sm ${
            side === 'buy'
              ? 'bg-accent-primary text-dark-bg'
              : 'border border-dark-border text-gray-400 hover:text-gray-300 hover:border-gray-500'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-3 rounded font-medium transition text-sm ${
            side === 'sell'
              ? 'bg-accent-red text-white'
              : 'border border-dark-border text-gray-400 hover:text-gray-300 hover:border-gray-500'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="mb-8 p-6 bg-dark-bg rounded border border-dark-border">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Entry Price</div>
        <div className="text-3xl font-semibold">
          ${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-3">Size (Contracts)</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0"
          className="w-full bg-dark-bg border border-dark-border rounded px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-accent-primary outline-none transition"
        />
        <div className="text-xs text-gray-500 mt-3">
          Notional: ${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
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
        <div className="text-xs text-gray-500 mt-3">
          Max Leverage: 20x
        </div>
      </div>

      <div className="mb-8 p-6 bg-dark-bg rounded border border-dark-border">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Margin Required</div>
        <div className="text-2xl font-semibold">
          ${margin.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
        </div>
      </div>

      <button
        className={`w-full py-3.5 rounded font-semibold transition text-sm ${
          side === 'buy'
            ? 'bg-accent-primary hover:opacity-90 text-dark-bg'
            : 'bg-accent-red hover:opacity-90 text-white'
        } ${(!size || margin <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!size || margin <= 0}
      >
        {side === 'buy' ? 'Open Long' : 'Open Short'}
      </button>

      <div className="text-xs text-gray-500 mt-4 text-center">
        Connect wallet to trade
      </div>
    </div>
  )
}
