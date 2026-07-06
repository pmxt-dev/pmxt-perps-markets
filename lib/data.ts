import { Market } from './types'

// Nothing is hardcoded here anymore. Every market is deployed on the Hayek chain
// and served from the catalog (/api/catalog → /v0/markets); its metadata (name,
// description, thumbnail, category, feed) lives on-chain in market_meta. This
// array stays empty so all markets load through the same path — no baked-in ones.
export const MARKETS: Market[] = []

export const CATEGORIES = ['All', 'Crypto', 'Pre-IPO', 'Indices', 'AI', 'Community'] as const
