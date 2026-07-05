export interface Market {
  id: string
  symbol: string
  asset: string
  category: Category
  status: "LIVE" | "UPCOMING"
  price: number
  change24h: number
  volume24h: number
  qi: number
  sparkline?: number[]
  action: string
  sourceType: 'yfinance' | 'orderbook'
  sourceTicker?: string
}

export type Category = "All" | "Crypto" | "Pre-IPO" | "AI" | "Community" | "Indices"
