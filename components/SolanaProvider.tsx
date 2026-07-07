'use client'

import { useMemo } from 'react'
import { clusterApiUrl } from '@solana/web3.js'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import '@solana/wallet-adapter-react-ui/styles.css'

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl('devnet')
  // Explicit Phantom adapter (not wallet-standard auto-detect) — the standard,
  // battle-tested connect path. Avoids the wallet-standard "Unexpected error".
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={(e) => console.error('[wallet]', e?.name ?? 'error', '—', (e as any)?.error ?? e?.message ?? String(e))}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
