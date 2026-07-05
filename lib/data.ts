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
  // rescale so the walk ends exactly at the current market price
  const k = basePrice / data[data.length - 1]
  return data.map((p) => p * k)
}

// Every market listed here is deployed on the Hayek chain (group 17148 on the
// 65.x validator). Prices come from /api/chain-markets; the static `price` is
// only the pre-hydration fallback. No mock markets.
export const MARKETS: Market[] = [
  {
    id: 'pmxt-perp',
    sourceType: 'onchain',
    chainSymbol: 'PMXT-PERP',
    selfOracled: true,
    thumbnail: 'https://www.pmxt.dev/_next/image?url=%2Ficon.png&w=48&q=75',
    symbol: 'PMXT-PERP',
    asset: 'PMXT (Pre-IPO)',
    category: 'Pre-IPO',
    status: 'LIVE',
    price: 0.10,
    change24h: 0,
    volume24h: 0,
    qi: 0,
    action: 'Trade',
    sparkline: generateSparkline(0.10, 0.032),
    description:
      'synthetic pre-ipo exposure to pmxt, live on the pmxt chain. listed at 10c against 1m shares outstanding ($100k implied valuation). oracle is a chain-side stub until the book takes over — price shown is read from the deployed market.',
  },
  {
    id: 'btc-perp',
    sourceType: 'onchain',
    chainSymbol: 'BTC-PERP',
    thumbnail: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    symbol: 'BTC-PERP',
    asset: 'Bitcoin',
    category: 'Crypto',
    status: 'LIVE',
    price: 63305,
    change24h: 0,
    volume24h: 0,
    qi: 0,
    action: 'Trade',
    sparkline: generateSparkline(63305, 0.015),
    description:
      'perpetual future on bitcoin, live on the pmxt chain. oracle currently a chain-side stub set at listing (spot at deploy time); funding keeps mark pinned once the feed streams. long or short with usdc collateral, no expiry.',
  },
]

export const CATEGORIES = ['All', 'Crypto', 'Pre-IPO'] as const
