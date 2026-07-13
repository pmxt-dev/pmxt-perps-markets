"use client"

import { useChartPart } from "./chart-context"

export function YAxis({
  tickFormatter,
  tickCount = 4,
  tickMargin = 8,
  edgeInset = 0,
}: {
  tickFormatter?: (value: number) => string
  tickCount?: number
  tickMargin?: number
  /** Drop ticks within this many px of the plot's top/bottom edge (local
   * addition — keeps labels clear of overlay chrome). */
  edgeInset?: number
}) {
  const ctx = useChartPart("YAxis")
  if (!ctx.ready) return null

  return (
    <g className="fill-current font-mono text-[10px] text-oklch(0.556 0 0) dark:text-oklch(0.708 0 0)">
      {ctx.y.ticks(tickCount).filter((t) => {
        const py = ctx.y(t)
        return py >= edgeInset && py <= ctx.plot.height - edgeInset
      }).map((t) => (
        <text
          key={t}
          x={-tickMargin}
          y={ctx.y(t)}
          textAnchor="end"
          dominantBaseline="central"
          fill="currentColor"
        >
          {tickFormatter ? tickFormatter(t) : t}
        </text>
      ))}
    </g>
  )
}
