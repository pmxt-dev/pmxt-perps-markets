// one price formatter for list, detail, and ticket — fixed decimals zero out micro-cap
// prices, so sub-$1 values switch to significant digits (0.0004123, not 0.0004)
export function fmtPrice(p: number): string {
  if (Math.abs(p) >= 1) {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return p.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}
