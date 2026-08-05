const PAST_EVENT_HISTORY_YEARS = 10
const PAST_EVENT_WINDOW_YEARS = 2

function shiftUtcYears(ymd: string, years: number): string {
  const date = new Date(`${ymd}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() + years)
  return date.toISOString().slice(0, 10)
}

function previousUtcDay(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export function getPastEventCandidateStart(rangeEndYmd: string, requestedFromYmd: string | null): string {
  const historyStart = shiftUtcYears(rangeEndYmd, -PAST_EVENT_HISTORY_YEARS)
  if (requestedFromYmd && requestedFromYmd > historyStart) return requestedFromYmd

  return historyStart
}

export interface PastEventQueryWindow {
  start: string
  end: string
}

/**
 * Split archive reads into newest-first, non-overlapping two-year windows.
 * The route can stop as soon as it has one page plus a look-ahead item.
 */
export function getPastEventQueryWindows(
  rangeEndYmd: string,
  requestedFromYmd: string | null
): PastEventQueryWindow[] {
  const historyStart = getPastEventCandidateStart(rangeEndYmd, requestedFromYmd)
  const windows: PastEventQueryWindow[] = []
  let end = rangeEndYmd

  while (end >= historyStart) {
    const shiftedStart = shiftUtcYears(end, -PAST_EVENT_WINDOW_YEARS)
    const start = shiftedStart > historyStart ? shiftedStart : historyStart
    windows.push({ start, end })
    if (start === historyStart) break
    end = previousUtcDay(start)
  }

  return windows
}
