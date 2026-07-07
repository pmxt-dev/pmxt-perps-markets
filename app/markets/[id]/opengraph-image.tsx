import { ImageResponse } from 'next/og'
import { fetchMarketById } from '@/lib/catalog-fetch'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'pmxt·perps market'

interface Props {
  params: { id: string }
}

export default async function Image({ params }: Props) {
  const m = await fetchMarketById(params.id)

  const symbol = m?.name ?? 'pmxt·perps'
  const price = m ? `$${m.markPrice}` : null
  const category = m?.meta?.category ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          padding: '80px',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, color: '#8a8a8a', letterSpacing: 4, textTransform: 'uppercase' }}>
          pmxt·perps
        </div>
        <div style={{ display: 'flex', fontSize: 96, color: '#ffffff', fontWeight: 700, marginTop: 24 }}>
          {symbol}
        </div>
        {price && (
          <div style={{ display: 'flex', fontSize: 56, color: '#4ade80', marginTop: 16 }}>
            {price}
          </div>
        )}
        {category && (
          <div style={{ display: 'flex', fontSize: 28, color: '#8a8a8a', marginTop: 24, textTransform: 'uppercase', letterSpacing: 2 }}>
            {category}
          </div>
        )}
        {!m && (
          <div style={{ display: 'flex', fontSize: 32, color: '#8a8a8a', marginTop: 24 }}>
            permissionless perpetual futures, on-chain
          </div>
        )}
      </div>
    ),
    { ...size },
  )
}
