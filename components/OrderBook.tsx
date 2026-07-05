// ponytail: deterministic mock book seeded from price — swap for live feed when the matching engine exists
interface OrderBookProps {
  price: number
}

interface Level {
  price: number
  size: number
  total: number
}

const LEVELS = 7

function buildBook(price: number): { asks: Level[]; bids: Level[] } {
  let seed = Math.floor(price * 1000) % 2147483647 || 42
  const rand = () => {
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647
  }
  const tick = price * 0.0005
  const mk = (dir: 1 | -1): Level[] => {
    const levels: Level[] = []
    let total = 0
    for (let i = 1; i <= LEVELS; i++) {
      const size = Math.round((rand() * 900 + 100) * (1 + i * 0.3))
      total += size
      levels.push({ price: price + dir * tick * i, size, total })
    }
    return levels
  }
  return { asks: mk(1), bids: mk(-1) }
}

export default function OrderBook({ price }: OrderBookProps) {
  const { asks, bids } = buildBook(price)
  const maxTotal = Math.max(asks[LEVELS - 1].total, bids[LEVELS - 1].total)
  const spread = asks[0].price - bids[0].price
  const digits = price < 10 ? 4 : 2

  const row = (l: Level, side: 'ask' | 'bid') => (
    <div key={`${side}-${l.price}`} className="relative flex justify-between px-3 py-1 text-[11px]">
      <div
        className={`absolute inset-y-0 right-0 ${side === 'ask' ? 'bg-no/10' : 'bg-yes/10'}`}
        style={{ width: `${(l.total / maxTotal) * 100}%` }}
      />
      <span className={`relative ${side === 'ask' ? 'text-no' : 'text-yes'}`}>
        {l.price.toFixed(digits)}
      </span>
      <span className="relative text-text">{l.size.toLocaleString()}</span>
      <span className="relative text-muted">{l.total.toLocaleString()}</span>
    </div>
  )

  return (
    <div className="font-mono">
      <div className="flex justify-between px-3 py-2 text-[10px] text-muted uppercase tracking-widest border-b border-border">
        <span>price</span>
        <span>size</span>
        <span>total</span>
      </div>
      <div>{[...asks].reverse().map((l) => row(l, 'ask'))}</div>
      <div className="flex justify-between px-3 py-1.5 border-y border-border text-[11px]">
        <span className="text-text">{price.toFixed(digits)}</span>
        <span className="text-muted">spread {spread.toFixed(digits)}</span>
      </div>
      <div>{bids.map((l) => row(l, 'bid'))}</div>
    </div>
  )
}
