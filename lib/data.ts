import { Market } from './types'

// ponytail: seeded LCG, not Math.random — server/client must generate identical data or hydration breaks
const generateSparkline = (basePrice: number, volatility: number, points: number = 48) => {
  let seed = Math.floor(basePrice * 1000) % 2147483647 || 42
  const rand = () => {
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647
  }
  const data = []
  let price = basePrice
  for (let i = 0; i < points; i++) {
    price = price * (1 + (rand() - 0.5) * volatility)
    data.push(price)
  }
  return data
}

export const MARKETS: Market[] = [
  {
    id: 'btc-perp',
    sourceType: 'yfinance',
    sourceTicker: 'BTC-USD',
    symbol: 'BTC-PERP',
    asset: 'Bitcoin',
    category: 'Crypto',
    status: 'LIVE',
    price: 112458.70,
    change24h: 1.23,
    volume24h: 4.21e9,
    qi: 832.1e6,
    action: 'Trade',
    sparkline: generateSparkline(112458.70, 0.015),
  },
  {
    id: 'eth-perp',
    sourceType: 'yfinance',
    sourceTicker: 'ETH-USD',
    symbol: 'ETH-PERP',
    asset: 'Ethereum',
    category: 'Crypto',
    status: 'LIVE',
    price: 3842.16,
    change24h: 2.84,
    volume24h: 2.17e9,
    qi: 512.37e6,
    action: 'Trade',
    sparkline: generateSparkline(3842.16, 0.028),
  },
  {
    id: 'pmxt-perp',
    sourceType: 'orderbook',
    symbol: 'PMXT-PERP',
    asset: 'PMXT (Pre-IPO)',
    category: 'Pre-IPO',
    status: 'LIVE',
    price: 0.4231,
    change24h: 3.21,
    volume24h: 120.53e6,
    qi: 89.24e6,
    action: 'Trade',
    sparkline: generateSparkline(0.4231, 0.032),
  },
  {
    id: 'newco-perp',
    sourceType: 'orderbook',
    symbol: 'NEWCO-PERP',
    asset: 'NewCo (Pre-IPO)',
    category: 'Pre-IPO',
    status: 'LIVE',
    price: 1.036,
    change24h: -2.11,
    volume24h: 8.21e6,
    qi: 12.33e6,
    action: 'Trade',
    sparkline: generateSparkline(1.036, 0.021),
  },
  {
    id: 'ai16z-perp',
    sourceType: 'yfinance',
    sourceTicker: 'AI16Z-USD',
    symbol: 'AI16Z-PERP',
    asset: 'AI16Z',
    category: 'AI',
    status: 'LIVE',
    price: 0.1872,
    change24h: 6.91,
    volume24h: 65.82e6,
    qi: 45.11e6,
    action: 'Trade',
    sparkline: generateSparkline(0.1872, 0.069),
  },
  {
    id: 'doge-perp',
    sourceType: 'yfinance',
    sourceTicker: 'DOGE-USD',
    symbol: 'DOGE-PERP',
    asset: 'Dogecoin',
    category: 'Community',
    status: 'LIVE',
    price: 0.1587,
    change24h: 1.74,
    volume24h: 42.69e6,
    qi: 31.22e6,
    action: 'Trade',
    sparkline: generateSparkline(0.1587, 0.017),
  },
  {
    id: 'ai-index-perp',
    sourceType: 'yfinance',
    sourceTicker: '^AIDX',
    symbol: 'AI-INDEX-PERP',
    asset: 'AI Index',
    category: 'Indices',
    status: 'LIVE',
    price: 1248.36,
    change24h: 0.92,
    volume24h: 18.37e9,
    qi: 15.67e6,
    action: 'Trade',
    sparkline: generateSparkline(1248.36, 0.009),
  },
]

export const CATEGORIES = ['All', 'Crypto', 'Pre-IPO', 'AI', 'Community', 'Indices'] as const
