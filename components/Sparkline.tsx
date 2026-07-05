interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  isPositive?: boolean
}

export default function Sparkline({
  data,
  width = 200,
  height = 60,
  isPositive = true,
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="w-full">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={points}
        fill={`url(#gradient-${isPositive ? 'green' : 'red'})`}
        opacity="0.1"
        stroke="none"
        strokeWidth="0"
      />
      <defs>
        <linearGradient
          id="gradient-green"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient
          id="gradient-red"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
    </svg>
  )
}
