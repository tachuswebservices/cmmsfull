import * as React from "react"

export function ChartGradient() {
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
        </linearGradient>
      </defs>
    </svg>
  )
}
