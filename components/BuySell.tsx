'use client'

import { useCallback, useEffect, useState } from 'react'
import { Transaction } from '@solana/web3.js'
import confetti from 'canvas-confetti'
import { fmtPrice } from '@/lib/format'
import { useTradingWallet } from '@/lib/useTradingWallet'
import type { BookData } from '@/components/OrderBook'

// Real trading ticket: the chain API builds unsigned txs, the wallet signs,
// /api/trade/submit relays to the validator. Orders land in the same book
// the seed liquidity lives in.
interface BuySellProps {
  symbol: string
  price: number
  book?: BookData | null
  // the market's taker fee (per-market, set at listing); tradable is quoted
  // net of it so the shown max always survives the on-chain health check
  feeBps?: number | null
}

interface AccountInfo {
  sol: number
  walletUsdc: number
  account: {
    address: string
    usdcUi: number
    equityUi?: number
    positions: { symbol: string; baseUi: number; unsettledPnlUi: number }[]
  } | null
}

const QUICK = [1, 5, 10, 50] as const

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const bytesToB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(s)
}

async function tradeApi(action: string, body: unknown): Promise<any> {
  const res = await fetch(`/api/trade/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = data?.error
    const msg = typeof e === 'string' ? e
      : (e && typeof e.message === 'string') ? e.message
      : `${action} failed (no error detail returned)`
    throw new Error(msg)
  }
  return data
}

export default function BuySell({ symbol, price, book, feeBps }: BuySellProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [amountStr, setAmountStr] = useState('')
  const [limitPriceStr, setLimitPriceStr] = useState('')
  const [depositStr, setDepositStr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<AccountInfo | null>(null)

  const { publicKey, connected, signTransaction, isDemo, connect } = useTradingWallet()

  const refreshAccount = useCallback(() => {
    if (!publicKey) { setInfo(null); return }
    fetch(`/api/trade/account?owner=${publicKey.toBase58()}`)
      .then(async (r) => { const d = await r.json(); if (r.ok) setInfo(d) })
      .catch(() => {})
  }, [publicKey])

  useEffect(() => {
    refreshAccount()
    const iv = setInterval(refreshAccount, 10_000)
    return () => clearInterval(iv)
  }, [refreshAccount])

  const signAndSubmit = async (txB64: string): Promise<string> => {
    if (!signTransaction) throw new Error('wallet cannot sign transactions')
    const tx = Transaction.from(b64ToBytes(txB64))
    const signed = await signTransaction(tx)
    const { signature } = await tradeApi('submit', { tx: bytesToB64(signed.serialize()) })
    return signature
  }

  const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
  const walletUsdc = info?.walletUsdc ?? 0
  const depositAmt = parseFloat(depositStr) || 0

  const onFund = async () => {
    if (!publicKey) return
    setError(null)
    try {
      if (isMainnet) {
        // real money: the user deposits a specific amount of their own USDC into
        // their trading balance (no faucet). `setup` builds the create+deposit tx.
        if (depositAmt <= 0) { setError('enter an amount to deposit'); return }
        if (depositAmt > walletUsdc) { setError('amount exceeds your wallet USDC'); return }
        setBusy('sign the deposit in your wallet…')
        const { tx } = await tradeApi('setup', { owner: publicKey.toBase58(), amount: depositAmt })
        await signAndSubmit(tx)
      } else {
        // devnet/local: faucet grants test USDC, then deposit the whole grant
        setBusy('requesting test funds…')
        await tradeApi('faucet', { owner: publicKey.toBase58() })
        setBusy('sign the deposit in your wallet…')
        const { tx } = await tradeApi('setup', { owner: publicKey.toBase58() })
        await signAndSubmit(tx)
      }
      setDepositStr('')
      refreshAccount()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'deposit failed')
    } finally {
      setBusy(null)
    }
  }

  const limitPrice = parseFloat(limitPriceStr) || 0
  const effPrice = orderType === 'limit' && limitPrice > 0 ? limitPrice : price
  // buy: the input is a USD amount → derive share count.
  // sell: the input is a share count directly → derive USD notional.
  const isBuy = side === 'buy'
  const amountNum = parseFloat(amountStr) || 0
  const contracts = isBuy ? (effPrice > 0 ? amountNum / effPrice : 0) : amountNum
  const notional = contracts * effPrice
  // touch prices for limit-order context (best bid / best ask)
  const bestBid = book?.bids?.length ? Math.max(...book.bids.map((l) => l.price)) : null
  const bestAsk = book?.asks?.length ? Math.min(...book.asks.map((l) => l.price)) : null

  const onTrade = async () => {
    if (!publicKey) return
    setError(null)
    try {
      setBusy('building order…')
      const { tx } = await tradeApi('order', {
        owner: publicKey.toBase58(),
        symbol,
        side,
        type: orderType,
        priceUi: orderType === 'limit' ? limitPrice : undefined,
        sizeUi: contracts,
      })
      setBusy('sign the order in your wallet…')
      await signAndSubmit(tx)
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } })
      setAmountStr('')
      refreshAccount()
      window.dispatchEvent(new Event('pmxt:trade'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'order failed')
    } finally {
      setBusy(null)
    }
  }

  const theme = isBuy
    ? { bg: 'bg-yes', text: 'text-yes' }
    : { bg: 'bg-no', text: 'text-no' }
  // 1x venue: a buy locks full notional + the market's taker fee, so the real
  // max spend is equity ÷ (1 + fee). Market orders are additionally margined at
  // the venue's 5% slippage cap (mirrors MARKET_ORDER_SLIPPAGE in exchange-core)
  // because the fill can land above the mark — without this the shown max can
  // pass the API pre-flight yet still bounce on-chain. Floored to cents.
  const feeFrac = (feeBps ?? 100) / 10_000
  const fillBuffer = orderType === 'market' ? 0.05 : 0
  // margin against real equity (init health) when the API provides it — open
  // positions consume equity while usdcUi stays untouched, so usdcUi over-quotes
  const marginBase = Math.max(0, info?.account?.equityUi ?? info?.account?.usdcUi ?? 0)
  const tradable = Math.floor((marginBase / ((1 + feeFrac) * (1 + fillBuffer))) * 100) / 100
  const position = info?.account?.positions.find((p) => p.symbol === symbol)
  const positionSize = position ? Math.abs(position.baseUi) : 0
  // margin applies to the exposure INCREASE only (mirrors the server pre-flight):
  // reducing/closing an opposite position is always allowed, and both sides are
  // gated — sells are share-denominated, so compare notional, not the raw input
  const posBase = position?.baseUi ?? 0
  const reducible = isBuy ? Math.max(0, -posBase) : Math.max(0, posBase)
  const increaseNotional = Math.max(0, contracts - reducible) * effPrice
  const overMax = increaseNotional > tradable + 1e-9
  const needsFunding = connected && (!info?.account || (tradable === 0 && !position))
  // default the deposit to the full wallet balance, floored to cents so it can
  // never round above the real balance (network fee is paid in SOL, not USDC)
  const maxDeposit = Math.floor(walletUsdc * 100) / 100

  useEffect(() => {
    if (isMainnet && needsFunding && maxDeposit > 0 && depositStr === '') {
      setDepositStr(maxDeposit.toFixed(2))
    }
  }, [isMainnet, needsFunding, maxDeposit, depositStr])

  return (
    <div className="font-mono flex flex-col gap-3">
      <div className="flex items-end border-b border-border">
        <span className="px-1 pb-2 text-sm font-semibold text-text tracking-wider truncate">{symbol}</span>
        <div className="flex-1" />
        <div className="flex gap-1 pb-1.5">
          {(['market', 'limit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`text-[10px] px-2 py-0.5 rounded-md border uppercase tracking-widest transition ${
                orderType === t ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 rounded-md text-sm border transition ${
            isBuy ? 'bg-yes/15 border-yes text-yes' : 'border-border text-muted hover:text-text'
          }`}
        >
          ▲ BUY / LONG
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 rounded-md text-sm border transition ${
            !isBuy ? 'bg-no/15 border-no text-no' : 'border-border text-muted hover:text-text'
          }`}
        >
          ▼ SELL / SHORT
        </button>
      </div>

      <div className="flex justify-between text-[11px] text-muted">
        <span>{orderType === 'market' ? 'est. entry' : 'mark'} <span className="text-text">${fmtPrice(price)}</span></span>
        {connected && (
          <span title={`max new exposure after the ${(feeFrac * 100).toFixed(2)}% taker fee`}>
            tradable <span className="text-text">${tradable.toFixed(2)}</span>
            {!isBuy && effPrice > 0 && <span className="text-muted"> ≈ {(tradable / effPrice).toFixed(4)} sh</span>}
          </span>
        )}
      </div>

      {position && Math.abs(position.baseUi) > 0 && (
        <div className="flex justify-between text-[11px] border border-border rounded-md px-2 py-1.5">
          <span className="text-muted">position</span>
          <span className={position.baseUi > 0 ? 'text-yes' : 'text-no'}>
            {position.baseUi > 0 ? '+' : ''}{position.baseUi} · pnl {position.unsettledPnlUi >= 0 ? '+' : ''}{position.unsettledPnlUi.toFixed(2)}
          </span>
        </div>
      )}

      {orderType === 'limit' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-text">limit price</span>
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-semibold text-text">$</span>
              <input
                inputMode="decimal"
                value={limitPriceStr}
                onChange={(e) => setLimitPriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={fmtPrice(price)}
                className="w-32 bg-bg border border-border rounded-md pl-7 pr-3 py-2 text-right text-base font-semibold text-text outline-none focus:border-muted"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>rests as maker · cancel anytime</span>
            {(bestBid !== null || bestAsk !== null) && (
              <span className="tabular-nums">
                bid{' '}
                <button
                  type="button"
                  disabled={bestBid === null}
                  onClick={() => bestBid !== null && setLimitPriceStr(String(bestBid))}
                  className="text-yes hover:underline disabled:no-underline"
                >
                  ${bestBid !== null ? fmtPrice(bestBid) : '—'}
                </button>
                {' · ask '}
                <button
                  type="button"
                  disabled={bestAsk === null}
                  onClick={() => bestAsk !== null && setLimitPriceStr(String(bestAsk))}
                  className="text-no hover:underline disabled:no-underline"
                >
                  ${bestAsk !== null ? fmtPrice(bestAsk) : '—'}
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text">{isBuy ? 'amount' : 'shares'}</span>
        <div className="relative shrink-0">
          {isBuy && (
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-semibold text-text">$</span>
          )}
          <input
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder={isBuy ? '0.00' : '0'}
            className={`w-32 bg-bg border border-border rounded-md ${isBuy ? 'pl-7' : 'pl-3'} pr-3 py-2 text-right text-base font-semibold text-text outline-none focus:border-muted`}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {isBuy ? (
          QUICK.map((v) => (
            <button
              key={v}
              onClick={() => {
                const next = Math.max(0.01, (parseFloat(amountStr) || 0) + v)
                setAmountStr((tradable > 0 ? Math.min(next, tradable) : next).toFixed(2))
              }}
              className="text-[11px] px-2 py-1 rounded-md border border-border text-muted hover:text-text hover:border-muted transition"
            >
              +${v}
            </button>
          ))
        ) : (
          <>
            {[0.25, 0.5, 1].map((frac) => (
              <button
                key={frac}
                disabled={positionSize <= 0}
                onClick={() => setAmountStr((positionSize * frac).toString())}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted hover:text-text hover:border-muted transition disabled:opacity-30"
              >
                {frac === 1 ? 'MAX' : `${frac * 100}%`}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="flex items-end justify-between border-t border-border pt-3">
        <div>
          <div className="text-sm text-text">{isBuy ? 'size' : 'proceeds'}</div>
          <div className="mt-0.5 text-[11px] text-muted">{contracts.toFixed(4)} shares</div>
        </div>
        <div className={`text-3xl font-bold tracking-tight ${theme.text}`}>
          ${notional.toFixed(2)}
        </div>
      </div>

      {contracts > 0 && (
        {overMax && (
          <div className="text-[11px] text-no">
            exceeds your margin — max new exposure ≈ ${tradable.toFixed(2)}
            {!isBuy && effPrice > 0 ? ` (${(tradable / effPrice).toFixed(4)} sh${reducible > 0 ? ` + ${reducible.toFixed(4)} sh closing` : ''})` : ''}
          </div>
        )}
        <div className={`text-[11px] ${isBuy ? 'text-yes' : 'text-no'}`}>
          {orderType === 'market'
            ? `→ ${isBuy ? 'long' : 'short'} ${contracts.toFixed(2)} ${symbol}`
            : `→ rest ${contracts.toFixed(2)} ${symbol} @ $${fmtPrice(effPrice)} · maker`}
        </div>
      )}

      {!connected ? (
        <button
          onClick={connect}
          className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none"
        >
          {isDemo ? 'START DEMO WALLET' : 'CONNECT WALLET'}
        </button>
      ) : needsFunding && isMainnet ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>fund your trading balance</span>
            <span>wallet <span className="text-text">${walletUsdc.toFixed(2)}</span></span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-text">deposit</span>
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-semibold text-text">$</span>
              <input
                inputMode="decimal"
                value={depositStr}
                onChange={(e) => setDepositStr(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="w-32 bg-bg border border-border rounded-md pl-7 pr-3 py-2 text-right text-base font-semibold text-text outline-none focus:border-muted"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={maxDeposit <= 0}
              onClick={() => setDepositStr(maxDeposit.toFixed(2))}
              className="text-[11px] px-2 py-1 rounded-md border border-border text-muted hover:text-text hover:border-muted transition disabled:opacity-30"
            >
              MAX
            </button>
          </div>
          <button
            onClick={onFund}
            disabled={busy !== null || depositAmt <= 0 || depositAmt > walletUsdc}
            className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {busy ?? 'DEPOSIT USDC TO TRADE'}
          </button>
          <div className="text-[10px] text-muted">deposit USDC to fund your trading balance · needs a little SOL for the network fee</div>
        </div>
      ) : needsFunding ? (
        <button
          onClick={onFund}
          disabled={busy !== null}
          className="w-full rounded-xl bg-accent/90 hover:bg-accent px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {busy ?? 'GET $1,000 TEST USDC'}
        </button>
      ) : (
        <button
          onClick={onTrade}
          disabled={busy !== null || contracts <= 0 || overMax || (orderType === 'limit' && limitPrice <= 0)}
          className={`w-full rounded-xl ${theme.bg} px-3 py-3 text-sm font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed`}
        >
          {busy ?? (isBuy ? `LONG ${symbol}` : `SHORT ${symbol}`)}
        </button>
      )}

      {overMax && (
        <div className="text-[11px] text-no">✗ max ${tradable.toFixed(2)} — covers the {(feeFrac * 100).toFixed(2)}% taker fee</div>
      )}
      {error && <div className="text-[11px] text-no">✗ {error}</div>}
      {isDemo && connected && (
        <div className="text-[10px] text-muted">
          demo wallet · {publicKey?.toBase58().slice(0, 4)}…{publicKey?.toBase58().slice(-4)} · signs locally, no extension
        </div>
      )}
    </div>
  )
}
