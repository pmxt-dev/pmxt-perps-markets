'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTradingWallet } from '@/lib/useTradingWallet'
import { tradeApi, fetchAccount, signAndSubmit, type AccountInfo } from '@/lib/trading'

const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
const usd = (n: number) => `$${n.toFixed(2)}`

// Nav wallet control: connect when signed out; when signed in, a dropdown that
// shows wallet + trading balances and lets the user deposit into / withdraw from
// their trading balance. The trade ticket has its own inline deposit prompt; this
// is the always-available account surface next to the wallet.
export function AccountMenu() {
  const { publicKey, connected, signTransaction, isDemo, connect, disconnect, reset } = useTradingWallet()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<AccountInfo | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => {
    if (!publicKey) { setInfo(null); return }
    fetchAccount(publicKey.toBase58()).then(setInfo).catch(() => {})
  }, [publicKey])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 10_000)
    return () => clearInterval(iv)
  }, [refresh])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // signed out → connect + one-line hint
  if (!connected || !publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline font-mono text-[10px] text-muted whitespace-nowrap">
          Solana wallet · trade in USDC
        </span>
        <button
          onClick={connect}
          className="font-mono text-xs border border-border rounded-md px-3 py-1.5 text-muted hover:text-text hover:border-muted transition"
        >
          {isDemo ? 'start demo wallet' : 'connect wallet'}
        </button>
      </div>
    )
  }

  const addr = publicKey.toBase58()
  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`
  const walletUsdc = info?.walletUsdc ?? 0
  const tradingUsdc = info?.account?.usdcUi ?? 0
  const sol = info?.sol ?? 0
  const amt = parseFloat(amount) || 0
  const max = Math.floor((tab === 'deposit' ? walletUsdc : tradingUsdc) * 100) / 100

  const setTabTo = (t: 'deposit' | 'withdraw') => { setTab(t); setAmount(''); setError(null) }

  const onSubmit = async () => {
    if (!signTransaction) { setError('wallet cannot sign'); return }
    setError(null)
    if (amt <= 0) { setError('enter an amount'); return }
    if (amt > max + 1e-9) { setError(`exceeds your ${tab === 'deposit' ? 'wallet' : 'trading'} balance`); return }
    try {
      if (tab === 'deposit') {
        setBusy('sign the deposit in your wallet…')
        // mainnet: deposit a specific amount of real USDC. devnet: faucet then deposit the grant.
        if (isMainnet) {
          const { tx } = await tradeApi('setup', { owner: addr, amount: amt })
          await signAndSubmit(signTransaction, tx)
        } else {
          await tradeApi('faucet', { owner: addr })
          const { tx } = await tradeApi('setup', { owner: addr })
          await signAndSubmit(signTransaction, tx)
        }
      } else {
        setBusy('sign the withdrawal in your wallet…')
        const { tx } = await tradeApi('withdraw', { owner: addr, amount: amt })
        await signAndSubmit(signTransaction, tx)
      }
      setAmount('')
      refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `${tab} failed`)
    } finally {
      setBusy(null)
    }
  }

  // demo wallets don't deposit/withdraw — keep the simple reset control
  if (isDemo) {
    return (
      <button
        onClick={() => reset?.()}
        title="reset demo wallet (generates a fresh burner)"
        className="font-mono text-xs border border-accent/40 rounded-md px-3 py-1.5 text-accent hover:border-no/40 hover:text-no transition"
      >
        demo {short}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-xs border border-accent/40 rounded-md px-3 py-1.5 text-accent hover:border-muted transition flex items-center gap-2"
      >
        <span>{usd(tradingUsdc)}</span>
        <span className="text-muted">·</span>
        <span>{short}</span>
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-bg shadow-xl p-4 z-50 font-mono">
          {/* balances */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">trading balance</span>
              <span className="text-text">{usd(tradingUsdc)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">in wallet</span>
              <span className="text-text">{usd(walletUsdc)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted">SOL (for fees)</span>
              <span className={sol < 0.03 ? 'text-no' : 'text-muted'}>{sol.toFixed(3)}</span>
            </div>
          </div>

          {/* deposit / withdraw tabs */}
          <div className="flex mb-3 border border-border rounded-md overflow-hidden text-xs">
            <button
              onClick={() => setTabTo('deposit')}
              className={`flex-1 py-1.5 transition ${tab === 'deposit' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}
            >
              deposit
            </button>
            <button
              onClick={() => setTabTo('withdraw')}
              className={`flex-1 py-1.5 transition ${tab === 'withdraw' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}
            >
              withdraw
            </button>
          </div>

          {/* amount + max */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 flex items-center border border-border rounded-md px-2">
              <span className="text-muted text-xs">$</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="w-full bg-transparent py-2 text-sm text-text outline-none"
              />
            </div>
            <button
              onClick={() => setAmount(max.toFixed(2))}
              disabled={max <= 0}
              className="text-[10px] text-accent border border-accent/40 rounded px-2 py-1.5 hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              max
            </button>
          </div>
          <div className="text-[10px] text-muted mb-3">
            {tab === 'deposit'
              ? 'moves USDC from your wallet into your trading balance so you can trade'
              : 'moves USDC from your trading balance back to your wallet'}
          </div>

          {tab === 'deposit' && !info?.account && sol < 0.03 && (
            <div className="text-[11px] text-no mb-2">
              first deposit creates your trading account (~0.03 SOL) — you have {sol.toFixed(3)}, top up SOL first
            </div>
          )}

          {error && <div className="text-[11px] text-no mb-2">{error}</div>}

          <button
            onClick={onSubmit}
            disabled={busy !== null || amt <= 0 || amt > max + 1e-9}
            className="w-full py-2 rounded-md bg-accent/15 border border-accent/40 text-accent text-sm hover:bg-accent/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ?? `${tab} ${amt > 0 ? usd(amt) : ''}`.trim()}
          </button>

          <div className="mt-3 pt-3 border-t border-border">
            <button
              onClick={() => { setOpen(false); disconnect?.() }}
              className="text-[11px] text-muted hover:text-no transition"
            >
              disconnect {short}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
