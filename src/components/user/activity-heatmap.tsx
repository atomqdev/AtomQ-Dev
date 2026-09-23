"use client"

import { useMemo, useState } from "react"

export interface HeatmapDay {
  date: string // YYYY-MM-DD (user's local calendar day)
  count: number
}

interface ActivityHeatmapProps {
  days: HeatmapDay[]
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
// GitHub shows weekday labels on alternating rows (Sun-indexed rows)
const WEEKDAY_LABELS: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" }

const CELL = 12 // px
const GAP = 3 // px
const COL_STRIDE = CELL + GAP

function levelClass(count: number): string {
  if (count <= 0) return "bg-muted"
  if (count <= 2) return "bg-primary/30"
  if (count <= 4) return "bg-primary/50"
  if (count <= 6) return "bg-primary/75"
  return "bg-primary"
}

function formatTooltipDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

interface TipState {
  x: number
  y: number
  above: boolean
  count: number
  date: string
}

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const [tip, setTip] = useState<TipState | null>(null)

  // Group days into week columns aligned to Sunday (first column may start mid-week)
  const weeks = useMemo(() => {
    if (days.length === 0) return []

    const byDate = new Map(days.map((d) => [d.date, d.count]))
    const first = new Date(`${days[0].date}T00:00:00Z`)
    const last = new Date(`${days[days.length - 1].date}T00:00:00Z`)

    const start = new Date(first)
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()) // back to Sunday

    const result: Array<Array<{ date: string; count: number } | null>> = []
    const cursor = new Date(start)

    while (cursor <= last) {
      const week: Array<{ date: string; count: number } | null> = []
      for (let i = 0; i < 7; i++) {
        const day = new Date(cursor)
        day.setUTCDate(day.getUTCDate() + i)
        if (day < first || day > last) {
          week.push(null) // padding keeps the 7-row grid shape
        } else {
          const key = day.toISOString().slice(0, 10)
          week.push({ date: key, count: byDate.get(key) ?? 0 })
        }
      }
      result.push(week)
      cursor.setUTCDate(cursor.getUTCDate() + 7)
    }

    return result
  }, [days])

  // Month label shows above the first week column whose Sunday starts a new month
  const monthLabels = useMemo(() => {
    const labels: Array<{ col: number; name: string }> = []
    let prevMonth = -1
    weeks.forEach((week, col) => {
      const firstDay = week.find((d) => d !== null)
      if (!firstDay) return
      const month = Number(firstDay.date.slice(5, 7)) - 1
      if (month !== prevMonth) {
        labels.push({ col, name: MONTHS[month] })
        prevMonth = month
      }
    })
    return labels
  }, [weeks])

  const handleCellEnter = (e: React.MouseEvent<HTMLDivElement>, count: number, date: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      above: rect.top > 70,
      count,
      date,
    })
  }

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      {/* Month labels + grid scroll together */}
      <div className="flex gap-2">
        {/* Weekday labels */}
        <div
          className="flex shrink-0 flex-col"
          style={{ gap: GAP, paddingTop: 18 }}
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="text-[10px] leading-none text-muted-foreground"
              style={{ height: CELL, width: 24 }}
            >
              {WEEKDAY_LABELS[row] ?? ""}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto pb-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar]:h-1.5">
          <div className="w-max">
            {/* Month labels */}
            <div className="relative mb-1" style={{ height: 14 }} aria-hidden="true">
              {monthLabels.map(({ col, name }) => (
                <span
                  key={`${col}-${name}`}
                  className="absolute top-0 whitespace-nowrap text-[10px] leading-none text-muted-foreground"
                  style={{ left: col * COL_STRIDE }}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Day cells: 7 rows, flowing column by column (one column = one week) */}
            <div
              className="grid w-max grid-flow-col grid-rows-7"
              style={{ gap: GAP, gridAutoColumns: `${CELL}px` }}
              role="img"
              aria-label="Activity heatmap of your submissions over the past year"
            >
              {weeks.map((week, wi) =>
                week.map((day, di) =>
                  day ? (
                    <div
                      key={`${wi}-${di}`}
                      className={`h-3 w-3 rounded-[2px] transition-colors ${levelClass(day.count)}`}
                      title={`${day.count} submission${day.count === 1 ? "" : "s"} — ${formatTooltipDate(day.date)}`}
                      onMouseEnter={(e) => handleCellEnter(e, day.count, day.date)}
                      onMouseLeave={() => setTip(null)}
                    />
                  ) : (
                    <div key={`${wi}-${di}`} className="h-3 w-3 rounded-[2px] invisible" />
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 3, 5, 8].map((c) => (
          <div key={c} className={`h-3 w-3 rounded-[2px] ${levelClass(c)}`} aria-hidden="true" />
        ))}
        <span>More</span>
      </div>

      {/* Shared hover tooltip */}
      {tip && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: Math.min(Math.max(tip.x, 90), (typeof window !== "undefined" ? window.innerWidth : 1200) - 90),
            top: tip.above ? tip.y - 8 : tip.y + CELL + 6,
            transform: `translate(-50%, ${tip.above ? "-100%" : "0"})`,
          }}
        >
          <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
            <span className="font-semibold">{tip.count}</span>{" "}
            <span className="text-popover-foreground/80">
              submission{tip.count === 1 ? "" : "s"} on {formatTooltipDate(tip.date)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
