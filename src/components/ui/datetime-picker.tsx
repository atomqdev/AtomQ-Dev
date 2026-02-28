"use client"

import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  id?: string
  required?: boolean
  placeholder?: string
}

export function DateTimePicker({
  value,
  onChange,
  label,
  id,
  required = false,
  placeholder,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const [hours, setHours] = React.useState<string>(
    value ? format(new Date(value), "hh") : "12"
  )
  const [minutes, setMinutes] = React.useState<string>(
    value ? format(new Date(value), "mm") : "00"
  )
  const [ampm, setAmPm] = React.useState<"AM" | "PM">(
    value && new Date(value).getHours() >= 12 ? "PM" : "AM"
  )
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (value) {
      const newDate = new Date(value)
      setDate(newDate)
      setHours(format(newDate, "hh"))
      setMinutes(format(newDate, "mm"))
      setAmPm(newDate.getHours() >= 12 ? "PM" : "AM")
    } else {
      setDate(undefined)
      setHours("12")
      setMinutes("00")
      setAmPm("AM")
    }
  }, [value])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      const newDateTime = new Date(selectedDate)
      const hours24 = ampm === "PM" ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12
      newDateTime.setHours(hours24)
      newDateTime.setMinutes(parseInt(minutes))
      onChange(newDateTime.toISOString())
    }
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d{0,2}$/.test(value)) {
      const numValue = parseInt(value)
      if (value === "" || (numValue >= 1 && numValue <= 12)) {
        setHours(value || "12")
        if (date) {
          const newDateTime = new Date(date)
          const hours24 = ampm === "PM" ? (numValue % 12) + 12 : numValue % 12
          newDateTime.setHours(hours24)
          onChange(newDateTime.toISOString())
        }
      }
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d{0,2}$/.test(value)) {
      const numValue = parseInt(value)
      if (value === "" || numValue >= 0 && numValue <= 59) {
        setMinutes(value || "00")
        if (date) {
          const newDateTime = new Date(date)
          const hours24 = ampm === "PM" ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12
          newDateTime.setHours(hours24)
          newDateTime.setMinutes(numValue || 0)
          onChange(newDateTime.toISOString())
        }
      }
    }
  }

  const handleAmPmChange = (value: "AM" | "PM") => {
    setAmPm(value)
    if (date) {
      const newDateTime = new Date(date)
      const hours24 = value === "PM" ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12
      newDateTime.setHours(hours24)
      newDateTime.setMinutes(parseInt(minutes))
      onChange(newDateTime.toISOString())
    }
  }

  const handleClear = () => {
    setDate(undefined)
    setHours("12")
    setMinutes("00")
    setAmPm("AM")
    onChange("")
  }

  const formatDisplayDate = () => {
    if (!date) return ""
    const newDate = new Date(date)
    const hours24 = ampm === "PM" ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12
    newDate.setHours(hours24)
    newDate.setMinutes(parseInt(minutes))
    return format(newDate, "MMM dd, yyyy 'at' hh:mm a")
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDisplayDate() || placeholder || "Select date and time"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
              />
              <div className="border-t pt-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Time</Label>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <Label htmlFor={`${id}-hours`} className="sr-only">
                      Hours
                    </Label>
                    <Input
                      id={`${id}-hours`}
                      type="number"
                      min="1"
                      max="12"
                      value={hours}
                      onChange={handleHoursChange}
                      placeholder="HH"
                      className="text-center"
                      disabled={!date}
                    />
                  </div>
                  <span className="text-muted-foreground">:</span>
                  <div className="flex-1">
                    <Label htmlFor={`${id}-minutes`} className="sr-only">
                      Minutes
                    </Label>
                    <Input
                      id={`${id}-minutes`}
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={handleMinutesChange}
                      placeholder="MM"
                      className="text-center"
                      disabled={!date}
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      value={ampm}
                      onValueChange={handleAmPmChange}
                      disabled={!date}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="px-3"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
