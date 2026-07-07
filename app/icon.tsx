import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          color: '#00d68f',
          fontFamily: 'monospace',
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        p
      </div>
    ),
    {
      ...size,
    }
  )
}
