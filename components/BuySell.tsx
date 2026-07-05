'use client'

import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

interface BuySellProps {
  symbol: string
  price: number
}

const QUICK = [1, 5, 10, 50] as const

export default function BuySell({ symbol, price }: BuySellProps) {
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [amountStr, setAmountStr] = useState('')
  const [leverage, setLeverage] = useState(1)

  const { connection } = useConnection()
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }
    let cancelled = false
    connection
      .getBalance(publicKey)
      .then((lamports) => { if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL) })
      .catch(() => { if (!cancelled) setBalance(null) })
    return () => { cancelled = true }
  }, [publicKey, connection])

  const amount = parseFloat(amountStr) || 0
  const notional = amount * leverage
  const contracts = price > 0 ? notional / price : 0

  const isLong = side === 'long'
  const theme = isLong
    ? { bg: 'bg-yes', text: 'text-yes', tint: 'bg-yes/10', border: 'border-yes/40' }
    : { bg: 'bg-no', text: 'text-no', tint: 'bg-no/10', border: 'border-no/40' }

  return (
    <div className="font-mono flex flex-col gap-3">
      <div className="flex items-end border-b border-border">
        <span className="px-1 pb-2 text-sm font-semibold text-text tracking-wider truncate">{symbol}</span>
        <div className="flex-1" />
        <span className="pb-2 text-[10px] text-muted uppercase tracking-widest">market</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSide('long')}
          className={`flex-1 py-2 rounded-md text-sm border transition ${
            isLong ? 'bg-yes/15 border-yes text-yes' : 'border-border text-muted hover:text-text'
          }`}
        >
          ▲ LONG
        </button>
        <button
          onClick={() => setSide('short')}
          className={`flex-1 py-2 rounded-md text-sm border transition ${
            !isLong ? 'bg-no/15 border-no text-no' : 'border-border text-muted hover:text-text'
          }`}
        >
          ▼ SHORT
        </button>
      </div>

      <div className="flex justify-between text-[11px] text-muted">
        <span>entry <span className="text-text">${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></span>
        <span>max lev <span className="text-text">20x</span></span>
      </div>

      {connected && (
        <div className="flex justify-between text-[11px] text-muted">
          <span>balance</span>
          <span className="text-text">{balance !== null ? `◎ ${balance.toFixed(4)}` : '…'}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text">margin</span>
        <div className="relative shrink-0">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-semibold text-text">$</span>
          <input
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            className="w-32 bg-bg border border-border rounded-md pl-7 pr-3 py-2 text-right text-base font-semibold text-text outline-none focus:border-muted"
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {QUICK.map((v) => (
          <button
            key={v}
            onClick={() => setAmountStr(Math.max(0.01, (parseFloat(amountStr) || 0) + v).toFixed(2))}
            className="text-[11px] px-2 py-1 rounded-md border border-border text-muted hover:text-text hover:border-muted transition"
          >
            +${v}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text">leverage</span>
          <span className={`text-sm font-semibold ${theme.text}`}>{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full cursor-pointer accent-accent"
        />
      </div>

      <div className="flex items-end justify-between border-t border-border pt-3">
        <div>
          <div className="text-sm text-text">position size</div>
          <div className="mt-0.5 text-[11px] text-muted">{contracts.toFixed(4)} contracts</div>
        </div>
        <div className={`text-3xl font-bold tracking-tight ${theme.text}`}>
          ${notional.toFixed(2)}
        </div>
      </div>

      {connected ? (
        <button
          disabled={amount <= 0}
          className={`w-full rounded-xl ${theme.bg} px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed`}
        >
          {isLong ? 'OPEN LONG' : 'OPEN SHORT'}
        </button>
      ) : (
        <button
          onClick={() => setVisible(true)}
          className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none"
        >
          CONNECT WALLET
        </button>
      )}
    </div>
  )
}
