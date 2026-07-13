'use client'

// Badge for dated markets (futures). Perpetuals (no expiresAt) render nothing.
// Far out → "settles SEP 2026"; inside 60 days → live countdown in days;
// past expiry → "settled" (the chain flips the market reduce-only + force-close
// via gate.expire_market, so trading is over).

export function isExpired(expiresAt?: number | null): boolean {
  return expiresAt != null && Date.now() >= expiresAt
}

export default function ExpiryBadge({ expiresAt }: { expiresAt?: number | null }) {
  if (expiresAt == null) return null
  const d = new Date(expiresAt)
  const monthYear = `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()} ${d.getUTCFullYear()}`
  if (isExpired(expiresAt)) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md border border-border text-muted shrink-0">
        settled {monthYear.toLowerCase()}
      </span>
    )
  }
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86_400_000)
  const label = daysLeft <= 60 ? `settles in ${daysLeft}d` : `settles ${monthYear.toLowerCase()}`
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#ff9f43]/10 border border-[#ff9f43]/40 text-[#ff9f43] shrink-0">
      {label}
    </span>
  )
}
