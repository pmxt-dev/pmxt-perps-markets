import { Keypair, Transaction } from '@solana/web3.js'

// Demo/burner wallet: a keypair generated and stored in the browser, used to
// sign transactions locally against the private validator. Bypasses Phantom,
// which can only simulate against its own cluster (mainnet) and so rejects
// transactions that are only valid on our chain. Opt in with ?demo in the URL.
const SECRET_KEY = 'pmxt.burner.secret'
const DEMO_FLAG = 'pmxt.demo'

let cached: Keypair | null = null

// tiny external store so every component sees the same burner + connect state
const listeners = new Set<() => void>()
let started = false
const notify = () => listeners.forEach(l => l())

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export function isStarted(): boolean {
  return started
}
export function hasBurner(): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(SECRET_KEY) !== null
}
export function startBurner(): void {
  getBurner()
  started = true
  notify()
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  const param = new URLSearchParams(window.location.search).get('demo')
  if (param !== null) {
    const on = param !== '0' && param !== 'false'
    window.localStorage.setItem(DEMO_FLAG, on ? '1' : '0')
    return on
  }
  return window.localStorage.getItem(DEMO_FLAG) === '1'
}

export function getBurner(): Keypair {
  if (cached) return cached
  const stored = window.localStorage.getItem(SECRET_KEY)
  if (stored) {
    try {
      cached = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored)))
      return cached
    } catch {
      // fall through to regenerate on corrupt storage
    }
  }
  cached = Keypair.generate()
  window.localStorage.setItem(SECRET_KEY, JSON.stringify([...cached.secretKey]))
  return cached
}

export function resetBurner(): Keypair {
  cached = Keypair.generate()
  window.localStorage.setItem(SECRET_KEY, JSON.stringify([...cached.secretKey]))
  started = true
  notify()
  return cached
}

export async function burnerSign(tx: Transaction): Promise<Transaction> {
  tx.partialSign(getBurner())
  return tx
}
