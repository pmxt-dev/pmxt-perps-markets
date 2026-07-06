'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
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

  if (demo) {
    const publicKey = active ? getBurner().publicKey : null
    return {
      publicKey,
      connected: publicKey !== null,
      isDemo: true,
      signTransaction: burnerSign,
      connect: startBurner,
      reset: () => { resetBurner() },
    }
  }

  return {
    publicKey: adapter.publicKey ?? null,
    connected: adapter.connected,
    isDemo: false,
    signTransaction: adapter.signTransaction,
    connect: () => setVisible(true),
    reset: null,
  }
}
