import { Market, Category } from './types'

// Shape returned by /api/catalog (chain state + stored metadata).
export interface CatalogEntry {
  index: number
  name: string
  oraclePrice: number
  markPrice: number
  liquidityUsd: number
  openInterestUsd: number
  volume24hUsd: number
  selfOracled: boolean
  meta: {
    category: string
    description: string
    selfOracled: boolean
    sourceTicker: string | null
    thumbnail: string | null
  } | null
}

const CATEGORY_MAP: Record<string, Category> = {
  crypto: 'Crypto',
  'pre-ipo': 'Pre-IPO',
  ai: 'AI',
  index: 'Indices',
  indices: 'Indices',
}

function toCategory(raw: string | undefined): Category {
  if (!raw) return 'Community'
  return CATEGORY_MAP[raw.toLowerCase()] ?? (raw as Category)
}

// build a Market from a catalog entry (for markets deployed at runtime that
// aren't in the static catalog)
export function catalogToMarket(e: CatalogEntry): Market {
  const cat = toCategory(e.meta?.category)
  const asset = e.name.replace(/-PERP$/, '')
  return {
    id: e.name.toLowerCase(),
    symbol: e.name,
    chainSymbol: e.name,
    asset,
    category: cat,
    status: 'LIVE',
    price: e.markPrice,
    change24h: 0,
    volume24h: e.volume24hUsd,
    qi: e.openInterestUsd,
    action: 'Trade',
    sourceType: 'onchain',
    selfOracled: e.selfOracled,
    sourceTicker: e.meta?.sourceTicker ?? undefined,
    thumbnail: e.meta?.thumbnail ?? undefined,
    description: e.meta?.description ?? `${e.name} — deployed on Solana.`,
  }
}
