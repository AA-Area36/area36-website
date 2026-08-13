const PAST_EVENT_HISTORY_YEARS = 10

export function getPastEventCandidateStart(rangeEndYmd: string, requestedFromYmd: string | null): string {
  if (requestedFromYmd) return requestedFromYmd

  const start = new Date(`${rangeEndYmd}T00:00:00Z`)
  start.setUTCFullYear(start.getUTCFullYear() - PAST_EVENT_HISTORY_YEARS)
  return start.toISOString().slice(0, 10)
}
