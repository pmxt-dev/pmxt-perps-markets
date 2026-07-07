import { Transaction } from '@solana/web3.js'

// Shared trading primitives used by the trade ticket and the nav account menu.
// Kept in one place so the sign→submit money path can't drift between callers.

export interface AccountInfo {
  sol: number
  walletUsdc: number
  account: {
    address: string
    usdcUi: number
    positions: { symbol: string; baseUi: number; unsettledPnlUi: number }[]
  } | null
}

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const bytesToB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// The chain API has two error envelopes: markets_api → { error: "msg" },
// v0_api → { error: { code, message } }. Never swallow either — surface the real
// message so failures are legible, not a generic "<action> failed".
export function errMessage(data: any, action: string): string {
  const e = data?.error
  if (typeof e === 'string') return e
  if (e && typeof e.message === 'string') return e.message
  if (typeof data?.message === 'string') return data.message
  return `${action} failed (no error detail returned)`
}

export async function tradeApi(action: string, body: unknown): Promise<any> {
  let res: Response
  try {
    res = await fetch(`/api/trade/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(`${action}: network error — ${e instanceof Error ? e.message : 'request failed'}`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errMessage(data, action))
  return data
}

export async function fetchAccount(owner: string): Promise<AccountInfo | null> {
  const r = await fetch(`/api/trade/account?owner=${owner}`)
  if (!r.ok) return null
  return r.json()
}

// build → sign → broadcast an unsigned tx; returns the signature
export async function signAndSubmit(
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  txB64: string,
): Promise<string> {
  const tx = Transaction.from(b64ToBytes(txB64))
  const signed = await signTransaction(tx)
  const { signature } = await tradeApi('submit', { tx: bytesToB64(signed.serialize()) })
  return signature
}
