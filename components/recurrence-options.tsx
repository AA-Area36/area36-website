"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RecurrenceConfig } from "@/lib/types/recurrence"

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const WEEK_ORDINALS = ["", "1st", "2nd", "3rd", "4th", "Last"]

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

interface RecurrenceOptionsProps {
  value: RecurrenceConfig
  onChange: (config: RecurrenceConfig) => void
  startDate: string // YYYY-MM-DD - used to derive patterns
  disabled?: boolean
  errors?: Record<string, string>
}

export function RecurrenceOptions({
  value,
  onChange,
  startDate,
  disabled = false,
  errors = {},
}: RecurrenceOptionsProps) {
  // Parse start date to get day info
  const startDateInfo = React.useMemo(() => {
    if (!startDate) {
      return {
        dayOfWeek: 0,
        dayOfMonth: 1,
        weekOfMonth: 1,
        dayName: "Sunday",
      }
    }
    const [year, month, day] = startDate.split("-").map(Number)
    const date = new Date(year, month - 1, day)
    const dayOfWeek = date.getDay()
    const dayOfMonth = date.getDate()
    // Calculate which occurrence of this weekday in the month (1st, 2nd, 3rd, 4th, or 5th/last)
    const weekOfMonth = Math.min(Math.ceil(dayOfMonth / 7), 5)
    
    return {
      dayOfWeek,
      dayOfMonth,
      weekOfMonth,
      dayName: DAYS_OF_WEEK[dayOfWeek],
    }
  }, [startDate])

  // Calculate max date (2 years from start)
  const maxRecurUntil = React.useMemo(() => {
    if (!startDate) return ""
    const [year, month, day] = startDate.split("-").map(Number)
    const start = new Date(year, month - 1, day)
    start.setFullYear(start.getFullYear() + 2)
    const y = start.getFullYear()
    const m = String(start.getMonth() + 1).padStart(2, "0")
    const d = String(start.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [startDate])

  // Calculate min recurUntil (day after start date)
  const minRecurUntil = React.useMemo(() => {
    if (!startDate) return ""
    const [year, month, day] = startDate.split("-").map(Number)
    const start = new Date(year, month - 1, day)
    start.setDate(start.getDate() + 1)
    const y = start.getFullYear()
    const m = String(start.getMonth() + 1).padStart(2, "0")
    const d = String(start.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [startDate])

  // Update patterns when start date changes (if recurring is enabled)
  React.useEffect(() => {
    if (!value.isRecurring || !startDate) return

    if (value.recurrenceType === "weekly") {
      // Update weekly pattern to match new start date's day
      if (value.weeklyPattern?.daysOfWeek[0] !== startDateInfo.dayOfWeek) {
        onChange({
          ...value,
          weeklyPattern: { daysOfWeek: [startDateInfo.dayOfWeek] },
        })
      }
    } else if (value.recurrenceType === "monthly") {
      // Update monthly pattern to match new start date
      if (value.monthlyPattern?.type === "dayOfMonth") {
        if (value.monthlyPattern.dayOfMonth !== startDateInfo.dayOfMonth) {
          onChange({
            ...value,
            monthlyPattern: { type: "dayOfMonth", dayOfMonth: startDateInfo.dayOfMonth },
          })
        }
      } else if (value.monthlyPattern?.type === "dayOfWeek") {
        if (
          value.monthlyPattern.weekOfMonth !== startDateInfo.weekOfMonth ||
          value.monthlyPattern.dayOfWeek !== startDateInfo.dayOfWeek
        ) {
          onChange({
            ...value,
            monthlyPattern: {
              type: "dayOfWeek",
              weekOfMonth: startDateInfo.weekOfMonth,
              dayOfWeek: startDateInfo.dayOfWeek,
            },
          })
        }
      }
    }
  }, [startDate, startDateInfo, value, onChange])

  const handleRecurringToggle = (checked: boolean) => {
    onChange({
      ...value,
      isRecurring: checked,
      recurrenceType: checked ? "weekly" : "none",
      weeklyPattern: checked ? { daysOfWeek: [startDateInfo.dayOfWeek] } : undefined,
      monthlyPattern: undefined,
      recurUntil: value.recurUntil || "",
    })
  }

  const handleTypeChange = (type: "weekly" | "monthly") => {
    onChange({
      ...value,
      recurrenceType: type,
      weeklyPattern: type === "weekly" ? { daysOfWeek: [startDateInfo.dayOfWeek] } : undefined,
      monthlyPattern: type === "monthly"
        ? { type: "dayOfMonth", dayOfMonth: startDateInfo.dayOfMonth }
        : undefined,
    })
  }

  const handleMonthlyPatternTypeChange = (patternType: "dayOfMonth" | "dayOfWeek") => {
    if (patternType === "dayOfMonth") {
      onChange({
        ...value,
        monthlyPattern: { type: "dayOfMonth", dayOfMonth: startDateInfo.dayOfMonth },
      })
    } else {
      onChange({
        ...value,
        monthlyPattern: {
          type: "dayOfWeek",
          weekOfMonth: startDateInfo.weekOfMonth,
          dayOfWeek: startDateInfo.dayOfWeek,
        },
      })
    }
  }

  const handleRecurUntilChange = (date: string) => {
    onChange({
      ...value,
      recurUntil: date,
    })
  }

  // Format the monthly pattern descriptions
  const dayOfMonthLabel = `${startDateInfo.dayOfMonth}${getOrdinalSuffix(startDateInfo.dayOfMonth)} of every month`
  const dayOfWeekLabel = `${WEEK_ORDINALS[startDateInfo.weekOfMonth]} ${startDateInfo.dayName} of every month`

  if (!value.isRecurring) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="recurring-toggle"
            checked={false}
            onCheckedChange={handleRecurringToggle}
            disabled={disabled || !startDate}
          />
          <Label htmlFor="recurring-toggle" className="cursor-pointer">
            Make this a recurring event
          </Label>
        </div>
        {!startDate && (
          <p className="text-xs text-muted-foreground">
            Select a start date first to enable recurrence options
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center space-x-2">
        <Switch
          id="recurring-toggle"
          checked={true}
          onCheckedChange={handleRecurringToggle}
          disabled={disabled}
        />
        <Label htmlFor="recurring-toggle" className="font-medium cursor-pointer">
          Recurring Event
        </Label>
      </div>

      {/* Recurrence Type */}
      <div className="space-y-2">
        <Label>Repeat</Label>
        <Select
          value={value.recurrenceType}
          onValueChange={(v) => handleTypeChange(v as "weekly" | "monthly")}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        {errors.recurrenceType && (
          <p className="text-sm text-destructive">{errors.recurrenceType}</p>
        )}
      </div>

      {/* Weekly Pattern - Just show the day, no selection */}
      {value.recurrenceType === "weekly" && (
        <div className="space-y-2">
          <div className="p-3 rounded-md bg-background border">
            <p className="text-sm">
              Every <span className="font-medium">{startDateInfo.dayName}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on your selected start date
          </p>
          {errors.weeklyPattern && (
            <p className="text-sm text-destructive">{errors.weeklyPattern}</p>
          )}
        </div>
      )}

      {/* Monthly Pattern - Two options based on start date */}
      {value.recurrenceType === "monthly" && (
        <div className="space-y-3">
          <Label>Monthly pattern</Label>
          <div className="space-y-2">
            {/* Day of Month Option */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="monthlyPatternType"
                checked={value.monthlyPattern?.type === "dayOfMonth"}
                onChange={() => handleMonthlyPatternTypeChange("dayOfMonth")}
                disabled={disabled}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">{dayOfMonthLabel}</span>
            </label>

            {/* Day of Week Option */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="monthlyPatternType"
                checked={value.monthlyPattern?.type === "dayOfWeek"}
                onChange={() => handleMonthlyPatternTypeChange("dayOfWeek")}
                disabled={disabled}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">{dayOfWeekLabel}</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on your selected start date
          </p>
          {errors.monthlyPattern && (
            <p className="text-sm text-destructive">{errors.monthlyPattern}</p>
          )}
        </div>
      )}

      {/* Recurrence End Date */}
      <div className="space-y-2">
        <Label htmlFor="recurUntil">Repeat until *</Label>
        <Input
          id="recurUntil"
          type="date"
          value={value.recurUntil || ""}
          onChange={(e) => handleRecurUntilChange(e.target.value)}
          min={minRecurUntil}
          max={maxRecurUntil}
          disabled={disabled}
        />
        {errors.recurUntil ? (
          <p className="text-sm text-destructive">{errors.recurUntil}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Maximum 2 years from start date
          </p>
        )}
      </div>
    </div>
  )
}
