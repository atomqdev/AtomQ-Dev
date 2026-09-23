"use client"

import { useMemo } from "react"
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { HeatmapDay } from "@/components/user/activity-heatmap"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const chartConfig = {
  count: { label: "Submissions", color: "var(--primary)" },
} satisfies ChartConfig

interface MonthlyActivityRadarProps {
  days: HeatmapDay[]
}

/**
 * GitHub-style companion chart for the Activity Map:
 * a radar ("dots") chart aggregating daily submissions into the
 * last 12 calendar months (oldest → current, clockwise).
 */
export function MonthlyActivityRadar({ days }: MonthlyActivityRadarProps) {
  const data = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const d of days) {
      const key = d.date.slice(0, 7) // YYYY-MM (already bucketed in the user's local timezone by the API)
      byMonth.set(key, (byMonth.get(key) ?? 0) + d.count)
    }

    // Last 12 calendar months ending with the current month (browser = user's local time)
    const now = new Date()
    const out: Array<{ month: string; count: number }> = []
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
      out.push({ month: MONTHS[dt.getMonth()], count: byMonth.get(key) ?? 0 })
    }
    return out
  }, [days])

  // Round axis to a sensible ceiling so the polygon doesn't hug the outer ring
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const axisMax = Math.ceil(maxCount / 5) * 5

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[180px] w-full min-w-0"
    >
      <RadarChart data={data}>
        <defs>
          <linearGradient id="fillMonthlyActivity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.15} />
          </linearGradient>
        </defs>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid gridType="polygon" />
        <PolarAngleAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis domain={[0, axisMax]} tick={false} axisLine={false} tickCount={5} />
        <Radar
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={1.5}
          fill="url(#fillMonthlyActivity)"
          fillOpacity={0.5}
          dot={{ r: 3.5, fill: "var(--color-count)", fillOpacity: 1, strokeWidth: 0 }}
        />
      </RadarChart>
    </ChartContainer>
  )
}
