import { ImageResponse } from 'next/og'
import { fetchMarketById, fetchPriceSeries } from '@/lib/catalog-fetch'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'pmxt·perps market'

const BG = '#0a0a0a'
const GREEN = '#4ade80'
const MUTED = '#8a8a8a'

interface Props {
  params: { id: string }
}

// line + filled-area SVG paths for a price series scaled into WxH
function plotPaths(series: number[], w: number, h: number): { line: string; area: string } | null {
  if (series.length < 2) return null
  const min = Math.min(...series)
  const max = Math.max(...series)
  const padY = h * 0.18
  const span = max - min
  const x = (i: number) => (i / (series.length - 1)) * w
  const y = (p: number) => (span === 0 ? h * 0.5 : h - padY - ((p - min) / span) * (h - 2 * padY))
  const pts = series.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`)
  return {
    line: `M ${pts.join(' L ')}`,
    area: `M ${x(0).toFixed(1)},${h} L ${pts.join(' L ')} L ${x(series.length - 1).toFixed(1)},${h} Z`,
  }
}

export default async function Image({ params }: Props) {
  const m = await fetchMarketById(params.id)
  const series = m ? await fetchPriceSeries(m.name) : []

  const symbol = m?.name ?? 'pmxt·perps'
  const price = m ? `$${m.markPrice}` : null
  const category = m?.meta?.category ?? null

  // full-bleed price plot behind the text — subtle grey, visible but not loud
  const paths = plotPaths(series, size.width, size.height)

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
        {paths && (
          <svg
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <path d={paths.area} fill="#ffffff" fillOpacity={0.035} />
            <path d={paths.line} fill="none" stroke="#4b5563" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
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
