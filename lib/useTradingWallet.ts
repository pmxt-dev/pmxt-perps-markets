'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  burnerSign, getBurner, hasBurner, isDemoMode, isStarted, resetBurner,
  startBurner, subscribe,
} from './burnerWallet'

// One wallet interface for the trade ticket, backed by either the real wallet
// adapter (Phantom etc.) or the in-browser burner in ?demo mode. In demo mode
// the burner is a single shared store, so building and signing never diverge.
export interface TradingWallet {
  publicKey: PublicKey | null
  connected: boolean
  isDemo: boolean
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined
  connect: () => void
  disconnect: (() => void) | undefined
  reset: (() => void) | null
}

export function useTradingWallet(): TradingWallet {
  const adapter = useWallet()
  const { setVisible } = useWalletModal()
  const [demo, setDemo] = useState(false)
  const active = useSyncExternalStore(subscribe, isStarted, () => false)

  useEffect(() => {
    if (!isDemoMode()) return
    setDemo(true)
    if (hasBurner()) startBurner() // auto-connect an existing burner
  }, [])

  // The modal only *selects* a wallet; with wallet-standard adapters autoConnect
  // doesn't reliably fire on a fresh manual pick (especially right after a
  // disconnect), so the Phantom popup closes without connecting. Explicitly
  // connect once the user asked to and a wallet is selected. Guarded by
  // wantConnect so a manual disconnect never loop-reconnects.

  // Keypair.publicKey returns a NEW PublicKey object on every access, so reading
  // it inline gives consumers an unstable reference — their useCallback/useEffect
  // deps then churn every render (this caused the portfolio to loop-fetch and
  // flicker). Memoize by base58 so the reference is stable until the burner changes.
  const burnerB58 = demo && active ? getBurner().publicKey.toBase58() : null
  const burnerPublicKey = useMemo(() => (burnerB58 ? new PublicKey(burnerB58) : null), [burnerB58])

  if (demo) {
    return {
      publicKey: burnerPublicKey,
      connected: burnerPublicKey !== null,
      isDemo: true,
      signTransaction: burnerSign,
      connect: startBurner,
      disconnect: undefined, // demo uses reset (regenerate burner) instead
      reset: () => { resetBurner() },
    }
  }

  return {
    publicKey: adapter.publicKey ?? null,
    connected: adapter.connected,
    isDemo: false,
    signTransaction: adapter.signTransaction,
    connect: () => setVisible(true),
    disconnect: () => { void adapter.disconnect() },
    reset: null,
  }
}
