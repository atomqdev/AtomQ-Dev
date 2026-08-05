"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  mode?: "single"
  selected?: Date | undefined
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  month?: Date
  onMonthChange?: (date: Date) => void
  className?: string
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  month: controlledMonth,
  onMonthChange,
  className,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(controlledMonth || new Date())
  const month = controlledMonth || internalMonth

  const handleMonthChange = (date: Date) => {
    if (onMonthChange) {
      onMonthChange(date)
    } else {
      setInternalMonth(date)
    }
  }

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1).getDay()

  const days = []
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} />)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    const isSelected = selected && 
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    
    const isDisabled = disabled && disabled(date)

    days.push(
      <button
        key={day}
        type="button"
        disabled={isDisabled}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal",
          isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          isDisabled && "opacity-50 cursor-not-allowed",
          !isSelected && !isDisabled && "hover:bg-accent hover:text-accent-foreground"
        )}
        onClick={() => !isDisabled && onSelect?.(date)}
      >
        {day}
      </button>
    )
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const goToPreviousMonth = () => {
    handleMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    handleMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
  }

  return (
    <div className={cn("p-3 space-y-4", className)}>
      {/* Month/Year Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">
          {monthNames[month.getMonth()]} {month.getFullYear()}
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted-foreground">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
