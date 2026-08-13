export type ConcurrencyLimiter = <T>(task: () => Promise<T>) => Promise<T>

/** Creates a FIFO limiter that bounds concurrently running async operations. */
export function createConcurrencyLimiter(limit: number): ConcurrencyLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Concurrency limit must be a positive integer")
  }

  let active = 0
  const queue: Array<() => void> = []

  const release = () => {
    active--
    queue.shift()?.()
  }

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve))
    }
    active++
    try {
      return await task()
    } finally {
      release()
    }
  }
}
