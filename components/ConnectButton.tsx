'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

export function ConnectButton() {
  const { publicKey, disconnect, connecting } = useWallet()
  const { setVisible } = useWalletModal()

  if (publicKey) {
    const addr = publicKey.toBase58()
    return (
      <button
        onClick={() => disconnect()}
        title="disconnect"
        className="font-mono text-xs border border-accent/40 rounded-md px-3 py-1.5 text-accent hover:border-no/40 hover:text-no transition"
      >
        {addr.slice(0, 4)}…{addr.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="font-mono text-xs border border-border rounded-md px-3 py-1.5 text-muted hover:text-text hover:border-muted transition disabled:opacity-50"
    >
      {connecting ? 'connecting…' : 'connect wallet'}
    </button>
  )
}
