'use client'

import { useState } from 'react'
import { fmtPrice } from '@/lib/format'

// ponytail: ported from exchange-web Sparkline, normalized to arbitrary price ranges
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

interface SparklineProps {
  data: number[]
  isPositive?: boolean
  // may contain nulls: a null is a gap (market closed, no live feed) and breaks
  // the oracle line into separate segments
  oracleSeries?: (number | null)[]
}

const COLS = 60
const ROWS = 22
const CELL = 6
const GAP = 1.2

function sampleTo(data: number[], cols: number): number[] {
  const out: number[] = []
  for (let c = 0; c < cols; c++) {
    const pos = (c / (cols - 1)) * (data.length - 1)
    const idx = Math.floor(pos)
    const frac = pos - idx
    const a = data[idx]
    const b = data[Math.min(idx + 1, data.length - 1)]
    out.push(a * (1 - frac) + b * frac)
  }
  return out
}

// null-aware resample: a column touching a null neighbour is itself null (a gap)
function sampleToNullable(data: (number | null)[], cols: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let c = 0; c < cols; c++) {
    const pos = (c / (cols - 1)) * (data.length - 1)
    const idx = Math.floor(pos)
    const a = data[idx]
    const b = data[Math.min(idx + 1, data.length - 1)]
    if (a == null || b == null) { out.push(null); continue }
    const frac = pos - idx
    out.push(a * (1 - frac) + b * frac)
  }
  return out
}

export default function Sparkline({ data, isPositive, oracleSeries }: SparklineProps) {
  const [hover, setHover] = useState<number | null>(null)
  if (!data || data.length < 2) return null

  const oracleOk = !!oracleSeries && oracleSeries.some((v) => v != null)
  const oracleVals = oracleOk ? oracleSeries!.filter((v): v is number => v != null) : []
  const all = oracleVals.length ? [...data, ...oracleVals] : data
  const rawMin = Math.min(...all)
  const rawMax = Math.max(...all)
  // pad the y-range: flat series render mid-height instead of collapsing to the
  // bottom row, and tiny wiggles stop being amplified to full chart height
  const rawRange = rawMax - rawMin
  const pad = rawRange > 0 ? rawRange * 0.15 : Math.abs(rawMax) * 0.5 || 1
  const min = rawMin - pad
  const max = rawMax + pad
  const range = max - min || 1

  const w = COLS * CELL
  const h = ROWS * CELL

  const sampled = sampleTo(data, COLS)
  const sampledOracle = oracleOk ? sampleToNullable(oracleSeries!, COLS) : null

  const trend = isPositive ?? data[data.length - 1] >= data[0]
  const color = trend ? '#00d68f' : '#ff4d5e'

  const dots = []
  for (let c = 0; c < COLS; c++) {
    const norm = (sampled[c] - min) / range
    const fillH = norm * (ROWS - 2) + 1
    for (let r = 0; r < ROWS; r++) {
      const threshold = (BAYER[c % 4][r % 4] + 0.5) / 16
      let show = false
      let opacity = 0.9
      if (r + 1 <= fillH) {
        show = true
      } else if (r < fillH) {
        if (fillH - r > threshold) show = true
      } else if (r < fillH + 1.5) {
        if (threshold < 0.35 - (r - fillH) * 0.3) {
          show = true
          opacity = 0.55
        }
      }
      if (show) {
        dots.push(
          <rect
            key={`${c}-${r}`}
            x={c * CELL + GAP / 2}
            y={h - (r + 1) * CELL + GAP / 2}
            width={CELL - GAP}
            height={CELL - GAP}
            fill={color}
            opacity={opacity}
          />,
        )
      }
    }
  }

  // break the oracle line at nulls (market-closed gaps) into separate segments
  const oracleSegments: string[][] = []
  if (sampledOracle) {
    let seg: string[] = []
    sampledOracle.forEach((v, c) => {
      if (v == null) { if (seg.length) { oracleSegments.push(seg); seg = [] } return }
      const y = h - (((v - min) / range) * (ROWS - 2) + 1) * CELL
      seg.push(`${c * CELL + CELL / 2},${y}`)
    })
    if (seg.length) oracleSegments.push(seg)
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const col = Math.max(0, Math.min(COLS - 1, Math.round((x / rect.width) * (COLS - 1))))
    setHover(col)
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
        {dots}
        {oracleSegments.filter((s) => s.length >= 2).map((s, i) => (
          <polyline
            key={`o${i}`}
            points={s.join(' ')}
            fill="none"
            stroke="#ff9f43"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.95}
          />
        ))}
        {hover != null && (
          <line
            x1={hover * CELL + CELL / 2}
            x2={hover * CELL + CELL / 2}
            y1={0}
            y2={h}
            stroke="#e8e8ea"
            strokeWidth={0.6}
            strokeDasharray="2 3"
            opacity={0.55}
          />
        )}
      </svg>
      {hover != null && (
        <div className="absolute top-1.5 right-1.5 font-mono text-[10px] bg-bg/85 border border-border rounded-md px-1.5 py-0.5 pointer-events-none">
          <span className={trend ? 'text-yes' : 'text-no'}>${fmtPrice(sampled[hover])}</span>
          {sampledOracle && sampledOracle[hover] != null && (
            <span className="text-[#ff9f43] ml-1.5">oracle ${fmtPrice(sampledOracle[hover]!)}</span>
          )}
        </div>
      )}
    </div>
  )
}
