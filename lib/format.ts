// one price formatter for list, detail, and ticket — sub-$10 assets need 4 decimals or they render as $0
export function fmtPrice(p: number): string {
  return p.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(p) < 10 ? 4 : 2,
  })
}
