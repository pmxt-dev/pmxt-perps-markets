// one price formatter for list, detail, and ticket — fixed decimals zero out micro-cap
// prices, so sub-$1 values switch to significant digits (0.0004123, not 0.0004)
// position / contract size: trims float noise — whole-ish for large sizes,
// up to 6 decimals for fractional (0.0048259999… → 0.004826)
export function fmtSize(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

export function fmtPrice(p: number): string {
  if (Math.abs(p) >= 1) {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return p.toLocaleString('en-US', { minimumSignificantDigits: 3, maximumSignificantDigits: 4 })
}
