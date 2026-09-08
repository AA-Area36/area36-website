import type { DateRange } from "react-day-picker"

const DATE_PARAM_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_EVENT_FILTER_YEAR = 2000
const MAX_EVENT_FILTER_YEAR = 2100

export function parseEventDateParam(value: string | null): Date | null {
  if (!value) return null
  const match = DATE_PARAM_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < MIN_EVENT_FILTER_YEAR || year > MAX_EVENT_FILTER_YEAR) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function parseEventDateRange(
  fromValue: string | null,
  toValue: string | null
): DateRange | undefined {
  if (!fromValue) return undefined

  const from = parseEventDateParam(fromValue)
  if (!from) return undefined

  if (!toValue) return { from }
  const to = parseEventDateParam(toValue)
  if (!to) return undefined

  return from.getTime() <= to.getTime()
    ? { from, to }
    : { from: to, to: from }
}
