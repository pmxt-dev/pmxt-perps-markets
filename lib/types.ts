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
  chart?: number[]
  action: string
}

export type Category = "All" | "Crypto" | "Pre-IPO" | "AI" | "Community" | "Indices"
