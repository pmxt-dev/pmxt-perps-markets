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

  const isBuy = side === 'buy'
  const theme = isBuy
    ? { bg: 'bg-accent-primary', text: 'text-accent-primary' }
    : { bg: 'bg-accent-red', text: 'text-accent-red' }

  return (
    <div className="font-mono flex flex-col gap-3">
      <div className="flex items-end border-b border-gray-700">
        <button
          onClick={() => setSide('buy')}
          className={`px-3 pb-2 -mb-px border-b-2 text-sm font-semibold transition tracking-wider ${
            isBuy ? 'border-accent-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-400'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`px-3 pb-2 -mb-px border-b-2 text-sm font-semibold transition tracking-wider ${
            !isBuy ? 'border-accent-red text-white' : 'border-transparent text-gray-500 hover:text-gray-400'
          }`}
        >
          SELL
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-400 mb-2">ENTRY PRICE</div>
          <div className="text-3xl font-bold">
            ${price.toLocaleString('en-US', { maximumFractionDigits: 1 })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm text-gray-300">size (contracts)</span>
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-semibold text-white">$</span>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="w-40 bg-black border border-gray-700 rounded-md pl-7 pr-3 py-2 text-right text-base font-semibold text-white outline-none focus:border-accent-primary transition"
              />
            </div>
          </div>
          <div className="text-xs text-gray-500 text-right">
            Notional: ${notional.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-300">leverage</label>
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
          <div className="text-xs text-gray-500 mt-2 text-right">Max Leverage: 20x</div>
        </div>

        <div className="rounded-md border border-gray-700 bg-black/30 px-3 py-3">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">MARGIN REQUIRED</div>
          <div className="text-2xl font-bold">
            ${margin.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
          </div>
        </div>

        <button
          className={`w-full rounded-xl px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none ${
            !size || margin <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          } ${theme.bg}`}
          disabled={!size || margin <= 0}
        >
          {isBuy ? 'OPEN LONG' : 'OPEN SHORT'}
        </button>

        <p className="text-xs text-gray-500 text-center">Connect wallet to trade</p>
      </div>
    </div>
  )
}
