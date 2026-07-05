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
  sourceType: 'yfinance' | 'orderbook' | 'onchain'
  sourceTicker?: string
  /** symbol of the deployed perp on the Hayek chain (matches /api/chain-markets) */
  chainSymbol?: string
  /** no external feed — the market's own orderbook sets the price; the on-chain
   * stub oracle is just Mango's required placeholder (set at listing, never fed) */
  selfOracled?: boolean
  description: string
  /** image url shown next to the market name; omitted → no image, no fallback */
  thumbnail?: string
}

export type Category = "All" | "Crypto" | "Pre-IPO" | "AI" | "Community" | "Indices"
