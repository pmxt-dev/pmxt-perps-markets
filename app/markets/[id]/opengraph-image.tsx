import { ImageResponse } from 'next/og'
import { fetchMarketById, fetchPriceSeries } from '@/lib/catalog-fetch'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'pmxt·perps market'

const BG = '#0a0a0a'
const GREEN = '#4ade80'
const MUTED = '#8a8a8a'

// mosaic ("boxplot") params — mirror components/Sparkline.tsx
const COLS = 60
const ROWS = 22
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

interface Props {
  params: { id: string }
}

function sampleTo(data: number[], cols: number): number[] {
  const out: number[] = []
  for (let c = 0; c < cols; c++) {
    const pos = (c / (cols - 1)) * (data.length - 1)
    const idx = Math.floor(pos)
    const frac = pos - idx
    out.push(data[idx] * (1 - frac) + data[Math.min(idx + 1, data.length - 1)] * frac)
  }
  return out
}

// the site's dithered block chart, rendered as subtle grey SVG rects filling WxH
function mosaicRects(series: number[], w: number, h: number) {
  if (series.length < 2) return null
  const rawMin = Math.min(...series)
  const rawMax = Math.max(...series)
  const rawRange = rawMax - rawMin
  const pad = rawRange > 0 ? rawRange * 0.15 : Math.abs(rawMax) * 0.5 || 1
  const min = rawMin - pad
  const range = rawMax + pad - min || 1
  const sampled = sampleTo(series, COLS)
  const cw = w / COLS
  const ch = h / ROWS
  const gap = 3
  const rects: React.ReactNode[] = []
  for (let c = 0; c < COLS; c++) {
    const fillH = ((sampled[c] - min) / range) * (ROWS - 2) + 1
    for (let r = 0; r < ROWS; r++) {
      const threshold = (BAYER[c % 4][r % 4] + 0.5) / 16
      let show = false
      let opacity = 0.1 // faint grey base
      if (r + 1 <= fillH) show = true
      else if (r < fillH) { if (fillH - r > threshold) show = true }
      else if (r < fillH + 1.5) { if (threshold < 0.35 - (r - fillH) * 0.3) { show = true; opacity = 0.05 } }
      if (show) {
        rects.push(
          <rect
            key={`${c}-${r}`}
            x={c * cw + gap / 2}
            y={h - (r + 1) * ch + gap / 2}
            width={cw - gap}
            height={ch - gap}
            fill="#ffffff"
            opacity={opacity}
          />,
        )
      }
    }
  }
  return rects
}

export default async function Image({ params }: Props) {
  const m = await fetchMarketById(params.id)
  const series = m ? await fetchPriceSeries(m.name) : []

  const symbol = m?.name ?? 'pmxt·perps'
  const price = m ? `$${m.markPrice}` : null
  const category = m?.meta?.category ?? null

  const rects = mosaicRects(series, size.width, size.height)

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BG,
          fontFamily: 'monospace',
        }}
      >
        {rects && (
          <svg
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            {rects}
          </svg>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            padding: '80px',
          }}
        >
          <div style={{ display: 'flex', fontSize: 28, color: MUTED, letterSpacing: 4, textTransform: 'uppercase' }}>
            pmxt·perps
          </div>
          <div style={{ display: 'flex', fontSize: 96, color: '#ffffff', fontWeight: 700, marginTop: 24 }}>
            {symbol}
          </div>
          {price && (
            <div style={{ display: 'flex', fontSize: 56, color: GREEN, marginTop: 16 }}>
              {price}
            </div>
          )}
          {category && (
            <div style={{ display: 'flex', fontSize: 28, color: MUTED, marginTop: 24, textTransform: 'uppercase', letterSpacing: 2 }}>
              {category}
            </div>
          )}
          {!m && (
            <div style={{ display: 'flex', fontSize: 32, color: MUTED, marginTop: 24 }}>
              permissionless perpetual futures, on-chain
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
