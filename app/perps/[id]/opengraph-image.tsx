import { ImageResponse } from 'next/og'
import { fetchMarketById, fetchPriceSeries } from '@/lib/catalog-fetch'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'pmxt·perps market'

const BG = '#000000'
const UP = '#00d68f'
const DOWN = '#ff5c5c'
const MUTED = '#8a8a8a'

interface Props {
  params: { id: string }
}

// build the line + filled-area SVG paths for a price series scaled into WxH
function plotPaths(series: number[], w: number, h: number): { line: string; area: string } | null {
  if (series.length < 2) return null
  const min = Math.min(...series)
  const max = Math.max(...series)
  const padY = h * 0.12
  const span = max - min
  const x = (i: number) => (i / (series.length - 1)) * w
  const y = (p: number) => (span === 0 ? h / 2 : h - padY - ((p - min) / span) * (h - 2 * padY))
  const pts = series.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`)
  const line = `M ${pts.join(' L ')}`
  const area = `M ${x(0).toFixed(1)},${h} L ${pts.join(' L ')} L ${x(series.length - 1).toFixed(1)},${h} Z`
  return { line, area }
}

// format a price without float noise (mirrors the app's fmtPrice intent)
function fmtPrice(p: number): string {
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return p.toLocaleString('en-US', { minimumSignificantDigits: 3, maximumSignificantDigits: 4 })
}

export default async function Image({ params }: Props) {
  const m = await fetchMarketById(params.id)
  const series = m ? await fetchPriceSeries(m.name) : []

  const symbol = m?.name ?? 'pmxt·perps'
  const category = m?.meta?.category ?? null
  const last = series.length ? series[series.length - 1] : m?.markPrice ?? null
  const first = series.length ? series[0] : null
  const changePct = first && last ? ((last - first) / first) * 100 : null
  const up = changePct === null ? true : changePct >= 0
  const color = up ? UP : DOWN

  const W = 1072 // 1200 - 2*64
  const PLOT_H = 300
  const paths = plotPaths(series, W, PLOT_H)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: BG,
          padding: '64px',
          fontFamily: 'monospace',
        }}
      >
        {/* header: symbol/category (left) + price/change (right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 26, color: MUTED, letterSpacing: 4, textTransform: 'uppercase' }}>
              pmxt·perps
            </div>
            <div style={{ display: 'flex', fontSize: 92, color: '#ffffff', fontWeight: 700, marginTop: 12 }}>
              {symbol}
            </div>
            {category && (
              <div style={{ display: 'flex', fontSize: 26, color: MUTED, marginTop: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
                {category}
              </div>
            )}
          </div>
          {last !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', fontSize: 68, color, fontWeight: 700 }}>${fmtPrice(last)}</div>
              {changePct !== null && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, color, marginTop: 8 }}>
                  <svg width={28} height={28} viewBox="0 0 10 10" style={{ marginRight: 10 }}>
                    <path d={up ? 'M5 1 L9 9 L1 9 Z' : 'M1 1 L9 1 L5 9 Z'} fill={color} />
                  </svg>
                  {up ? '+' : ''}{changePct.toFixed(2)}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* the actual price plot */}
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'flex-end' }}>
          {paths ? (
            <svg width={W} height={PLOT_H} viewBox={`0 0 ${W} ${PLOT_H}`} style={{ display: 'block' }}>
              <path d={paths.area} fill={color} fillOpacity={0.14} />
              <path d={paths.line} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          ) : (
            <div style={{ display: 'flex', fontSize: 30, color: MUTED }}>
              {m ? 'no trades yet — be the first' : 'permissionless perpetual futures, on-chain'}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
