import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          color: '#eef4f1',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            letterSpacing: -2,
          }}
        >
          pmxt<span style={{ color: '#00d68f' }}>&middot;</span>perps
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#7a8a83',
            marginTop: 24,
          }}
        >
          launch anything &middot; trade perps on-chain
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
