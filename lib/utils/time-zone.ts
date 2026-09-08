/** Accept only time zones supported by the runtime's IANA time-zone data. */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value })
    return value.length > 0
  } catch {
    return false
  }
}
