// ponytail: renders the REAL on-chain book (resting orders on the Mango CLOB).
// No synthetic levels — loading, error, and empty states are shown as what they are.
export interface BookLevel {
  price: number
  size: number
}

export interface BookData {
  bids: BookLevel[]
  asks: BookLevel[]
}

interface OrderBookProps {
  price: number
  book: BookData | null
  error: string | null
}

interface Level extends BookLevel {
  total: number
}

function withTotals(levels: BookLevel[]): Level[] {
  let total = 0
  return levels.map(l => {
    total += l.size
    return { ...l, total }
  })
}

// sub-1 sizes (e.g. 0.0002 BTC) must not round to "0"
function fmtSize(n: number): string {
  if (n === 0) return '0'
  if (Math.abs(n) >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}

export default function OrderBook({ price, book, error }: OrderBookProps) {
  const digits = price < 10 ? 4 : 2

  if (error) {
    return (
      <div className="font-mono px-3 py-4 text-[11px] text-no">✗ book unavailable: {error}</div>
    )
  }
  if (!book) {
    return <div className="font-mono px-3 py-4 text-[11px] text-muted">loading book…</div>
  }

  const asks = withTotals(book.asks)
  const bids = withTotals(book.bids)
  if (asks.length === 0 && bids.length === 0) {
    return (
      <div className="font-mono px-3 py-4 text-[11px] text-muted">
        book is empty — no resting orders on chain
      </div>
    )
  }

  const maxTotal = Math.max(asks[asks.length - 1]?.total ?? 0, bids[bids.length - 1]?.total ?? 0) || 1
  const bestAsk = book.asks[0]?.price
  const bestBid = book.bids[0]?.price
  const spread = bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : null
  const mid = bestAsk !== undefined && bestBid !== undefined ? (bestAsk + bestBid) / 2 : price

  const row = (l: Level, side: 'ask' | 'bid') => (
    <div key={`${side}-${l.price}`} className="relative flex justify-between px-3 py-1 text-[11px]">
      <div
        className={`absolute inset-y-0 right-0 ${side === 'ask' ? 'bg-no/10' : 'bg-yes/10'}`}
        style={{ width: `${(l.total / maxTotal) * 100}%` }}
      />
      <span className={`relative ${side === 'ask' ? 'text-no' : 'text-yes'}`}>
        {l.price.toFixed(digits)}
      </span>
      <span className="relative text-text">{fmtSize(l.size)}</span>
      <span className="relative text-muted">{fmtSize(l.total)}</span>
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
        <span className="text-text">{mid.toFixed(digits)}</span>
        <span className="text-muted">
          {spread !== null ? `spread ${spread.toFixed(digits)}` : 'one-sided book'}
        </span>
      </div>
      <div>{bids.map((l) => row(l, 'bid'))}</div>
    </div>
  )
}
