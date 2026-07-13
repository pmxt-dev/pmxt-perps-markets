'use client'

import { useState } from 'react'
import { fmtPrice, fmtPricePrecise } from '@/lib/format'

// Retro dithered price chart with an oracle overlay.
//
//   price  — the mark/last-price series, drawn as a Bayer-dithered filled area.
//   oracle — the reference the book trades around, drawn in orange at the feed's
//            true cadence. A null means the external feed is closed at that point,
//            so: continuous feeds (BTC ticking) → an unbroken line; market-hours
//            feeds (stocks) → daytime segments with overnight gaps; sparse
//            scheduled feeds (DDR5's 3 prints/day) → isolated dots per print.

const COLS = 60
const ROWS = 22
const CELL = 6
const GAP = 1.2
const UP = '#00d68f'
const DOWN = '#ff4d5e'
const ORACLE = '#ff9f43'

// 4x4 Bayer matrix — ordered dithering for the soft top edge of the fill
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

// View modes for the fill, à la tripwire.sh/dither-kit:
//   solid    — every cell below the line (dithered top edge only)
//   gradient — dither density fades toward the bottom
//   dotted   — dot grid instead of squares
//   hatched  — diagonal pixel stripes
const MODES = ['solid', 'gradient', 'dotted', 'hatched'] as const
type ViewMode = (typeof MODES)[number]

interface SparklineProps {
  data: number[] // price series, oldest → newest
  oracleSeries?: (number | null)[] // oracle aligned to `data`; null = feed closed
  isPositive?: boolean
  showModes?: boolean // render the view-mode switcher (detail page only)
}

// Resample any-length series to exactly `cols` points (linear interpolation).
function resample(series: number[], cols: number): number[] {
  return Array.from({ length: cols }, (_, c) => {
    const pos = (c / (cols - 1)) * (series.length - 1)
    const i = Math.floor(pos)
    const f = pos - i
    return series[i] * (1 - f) + series[Math.min(i + 1, series.length - 1)] * f
  })
}

// Null-aware resample: interpolate where both neighbours exist; where they
// don't, fall back to any value inside the column's slice of the source so an
// isolated print (sparse scheduled feed) survives downsampling as a dot
// instead of being dropped to null.
function resampleNullable(series: (number | null)[], cols: number): (number | null)[] {
  const toPos = (c: number) => (c / (cols - 1)) * (series.length - 1)
  return Array.from({ length: cols }, (_, c) => {
    const pos = toPos(c)
    const i = Math.floor(pos)
    const a = series[i]
    const b = series[Math.min(i + 1, series.length - 1)]
    if (a != null && b != null) {
      const f = pos - i
      return a * (1 - f) + b * f
    }
    const start = Math.ceil(toPos(Math.max(0, c - 0.5)))
    const end = Math.floor(toPos(Math.min(cols - 1, c + 0.5)))
    for (let j = start; j <= end; j++) if (series[j] != null) return series[j]
    return null
  })
}

export default function Sparkline({ data, oracleSeries, isPositive, showModes }: SparklineProps) {
  const [hover, setHover] = useState<number | null>(null)
  const [mode, setMode] = useState<ViewMode>('solid')
  if (!data || data.length < 2) return null

  const price = resample(data, COLS)
  const hasOracle = !!oracleSeries?.some((v) => v != null)
  const oracle = hasOracle ? resampleNullable(oracleSeries!, COLS) : null

  // y-scale spans price + oracle so both stay on-screen, with headroom padding
  const values = [...price, ...(oracle?.filter((v): v is number => v != null) ?? [])]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = hi - lo > 0 ? (hi - lo) * 0.15 : Math.abs(hi) * 0.5 || 1
  const yMin = lo - pad
  const yRange = hi + pad - yMin

  const w = COLS * CELL
  const h = ROWS * CELL
  const xOf = (c: number) => c * CELL + CELL / 2
  const yOf = (v: number) => h - (((v - yMin) / yRange) * (ROWS - 2) + 1) * CELL

  const up = isPositive ?? price[price.length - 1] >= price[0]
  const priceColor = up ? UP : DOWN

  // price fill: one dithered column per sample
  const cells: React.ReactNode[] = []
  for (let c = 0; c < COLS; c++) {
    const fillH = ((price[c] - yMin) / yRange) * (ROWS - 2) + 1
    for (let r = 0; r < ROWS; r++) {
      const threshold = (BAYER[c % 4][r % 4] + 0.5) / 16
      let show = false
      let opacity = 0.9
      if (r + 1 <= fillH) {
        // interior cell — the view mode decides how it's drawn
        if (mode === 'gradient') show = 0.15 + 0.85 * ((r + 0.5) / fillH) > threshold
        else if (mode === 'hatched') show = (c + r) % 3 === 0
        else show = true // solid + dotted fill every cell
      }
      else if (r < fillH) show = fillH - r > threshold
      else if (r < fillH + 1.5 && threshold < 0.35 - (r - fillH) * 0.3) { show = true; opacity = 0.55 }
      if (show) {
        cells.push(
          mode === 'dotted' ? (
            <circle
              key={`p${c}-${r}`}
              cx={c * CELL + CELL / 2}
              cy={h - (r + 1) * CELL + CELL / 2}
              r={(CELL - GAP) / 2.6}
              fill={priceColor}
              opacity={opacity}
            />
          ) : (
            <rect
              key={`p${c}-${r}`}
              x={c * CELL + GAP / 2}
              y={h - (r + 1) * CELL + GAP / 2}
              width={CELL - GAP}
              height={CELL - GAP}
              fill={priceColor}
              opacity={opacity}
            />
          ),
        )
      }
    }
  }

  // oracle: continuous polyline, split into segments across null gaps
  const oracleSegments: string[][] = []
  if (oracle) {
    let seg: string[] = []
    oracle.forEach((v, c) => {
      if (v == null) {
        if (seg.length) oracleSegments.push(seg)
        seg = []
      } else {
        seg.push(`${xOf(c)},${yOf(v)}`)
      }
    })
    if (seg.length) oracleSegments.push(seg)
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const col = Math.round(((e.clientX - rect.left) / rect.width) * (COLS - 1))
    setHover(Math.max(0, Math.min(COLS - 1, col)))
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full block"
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {cells}
        {oracleSegments.map((seg, i) =>
          seg.length === 1 ? (
            // a lone oracle point (feed briefly open) — a dot so it's still visible
            <circle key={`o${i}`} cx={Number(seg[0].split(',')[0])} cy={Number(seg[0].split(',')[1])} r={2.5} fill={ORACLE} />
          ) : (
            <polyline key={`o${i}`} points={seg.join(' ')} fill="none" stroke={ORACLE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ),
        )}
        {hover != null && (
          <line x1={xOf(hover)} x2={xOf(hover)} y1={0} y2={h} stroke="#e8e8ea" strokeWidth={1} opacity={0.25} />
        )}
      </svg>
      {showModes && (
        <div className="absolute bottom-1.5 left-1.5 flex gap-0.5 font-mono text-[9px] bg-bg/85 border border-border rounded-md px-1 py-0.5">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-1 rounded ${m === mode ? 'text-text bg-border/60' : 'text-muted hover:text-text'}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      {hover != null && (
        <div className="absolute top-1.5 right-1.5 font-mono text-[10px] bg-bg/85 border border-border rounded-md px-1.5 py-0.5 pointer-events-none">
          <span className={up ? 'text-yes' : 'text-no'}>${fmtPrice(price[hover])}</span>
          {oracle?.[hover] != null && (
            <span className="text-[#ff9f43] ml-1.5">oracle ${fmtPricePrecise(oracle[hover]!)}</span>
          )}
        </div>
      )}
    </div>
  )
}
