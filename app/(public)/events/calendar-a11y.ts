export function getCalendarCellLabel({
  date,
  isToday,
  eventTitles,
}: {
  date: Date
  isToday: boolean
  eventTitles: string[]
}): string {
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const todayLabel = isToday ? ", today" : ""
  const eventsLabel =
    eventTitles.length === 0
      ? ", no events"
      : `, ${eventTitles.length} ${eventTitles.length === 1 ? "event" : "events"}: ${eventTitles.join(", ")}`

  return `${dateLabel}${todayLabel}${eventsLabel}`
}
