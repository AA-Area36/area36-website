import { invalidateEdgeCache } from "@/lib/cache/edge-cache"

const APPROVED_EVENTS_CACHE_KEY = "events:approved"
const CALENDAR_CACHE_KEY = "calendar:ical"
const DISTRICT_NUMBERS = Array.from({ length: 27 }, (_, index) => index + 1).filter(
  (districtNumber) => districtNumber !== 10
)

export async function invalidateEventCaches(districtNumber?: number | null): Promise<void> {
  const keys = new Set<string>([APPROVED_EVENTS_CACHE_KEY, CALENDAR_CACHE_KEY])

  if (districtNumber) {
    keys.add(`${APPROVED_EVENTS_CACHE_KEY}:district:${districtNumber}`)
  } else {
    for (const district of DISTRICT_NUMBERS) {
      keys.add(`${APPROVED_EVENTS_CACHE_KEY}:district:${district}`)
    }
  }

  await Promise.all([...keys].map((key) => invalidateEdgeCache(key)))
}
