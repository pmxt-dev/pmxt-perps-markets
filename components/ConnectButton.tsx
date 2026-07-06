'use client'

import { useTradingWallet } from '@/lib/useTradingWallet'

export function ConnectButton() {
  const { publicKey, connected, isDemo, connect, disconnect, reset } = useTradingWallet()

  if (connected && publicKey) {
    const addr = publicKey.toBase58()
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`
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
      <button
        onClick={() => disconnect?.()}
        title="disconnect wallet"
        className="font-mono text-xs border border-accent/40 rounded-md px-3 py-1.5 text-accent hover:border-no/40 hover:text-no transition"
      >
        {short}
      </button>
    )
  }

  return (
    <button
      onClick={connect}
      className="font-mono text-xs border border-border rounded-md px-3 py-1.5 text-muted hover:text-text hover:border-muted transition"
    >
      {isDemo ? 'start demo wallet' : 'connect wallet'}
    </button>
  )
}
