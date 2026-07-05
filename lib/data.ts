import { Market } from './types'

const generateSparkline = (basePrice: number, volatility: number, points: number = 24) => {
  const data = []
  let price = basePrice
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * volatility
    price = price * (1 + change)
    data.push(price)
  }
  return data
}

export const MARKETS: Market[] = [
  {
    id: 'btc-perp',
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
