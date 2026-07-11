const SINGLE_FLIGHT_KEY = "__area36_single_flight__"

function getFlights(): Map<string, Promise<unknown>> {
  const scope = globalThis as unknown as {
    [SINGLE_FLIGHT_KEY]?: Map<string, Promise<unknown>>
  }
  if (!scope[SINGLE_FLIGHT_KEY]) scope[SINGLE_FLIGHT_KEY] = new Map()
  return scope[SINGLE_FLIGHT_KEY]!
}

/** Coalesces concurrent work for the same key within a Worker isolate. */
export function runSingleFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const flights = getFlights()
  const existing = flights.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = task().finally(() => {
    if (flights.get(key) === promise) flights.delete(key)
  })
  flights.set(key, promise)
  return promise
}

export async function registerBackgroundWork(promise: Promise<unknown>): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { ctx } = await getCloudflareContext({ async: true })
    if (ctx?.waitUntil) {
      ctx.waitUntil(promise)
      return true
    }
  } catch {
    // Local/non-Workers runtimes have no execution context.
  }
  return false
}
