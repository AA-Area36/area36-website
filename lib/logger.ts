/**
 * Structured logging utility for Cloudflare Workers
 * Helps diagnose "Worker exceeded resource limits" (Error 1102) issues
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  requestId?: string
  route?: string
  method?: string
  [key: string]: unknown
}

interface PerformanceEntry {
  name: string
  startTime: number
  duration?: number
  metadata?: Record<string, unknown>
}

// Request-scoped storage for tracking
const requestStore = new Map<string, {
  startTime: number
  context: LogContext
  operations: PerformanceEntry[]
  subrequestCount: number
}>()

// Generate a short unique request ID
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Format log entry as JSON for Cloudflare
function formatLog(level: LogLevel, message: string, context?: LogContext, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...data,
  }
  return JSON.stringify(entry)
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>, context?: LogContext) {
    console.log(formatLog("debug", message, context, data))
  },

  info(message: string, data?: Record<string, unknown>, context?: LogContext) {
    console.log(formatLog("info", message, context, data))
  },

  warn(message: string, data?: Record<string, unknown>, context?: LogContext) {
    console.warn(formatLog("warn", message, context, data))
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errorData = error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { errorValue: String(error) }
    console.error(formatLog("error", message, context, errorData))
  },
}

/**
 * Performance tracker for diagnosing resource limit issues
 */
export class PerformanceTracker {
  private requestId: string
  private startTime: number
  private operations: PerformanceEntry[] = []
  private subrequestCount = 0
  private context: LogContext

  constructor(context?: LogContext) {
    this.requestId = generateRequestId()
    this.startTime = performance.now()
    this.context = { ...context, requestId: this.requestId }
    
    requestStore.set(this.requestId, {
      startTime: this.startTime,
      context: this.context,
      operations: this.operations,
      subrequestCount: 0,
    })
  }

  /**
   * Track a subrequest (API call, DB query, etc.)
   * Cloudflare Workers have limits on concurrent subrequests
   */
  trackSubrequest() {
    this.subrequestCount++
    const stored = requestStore.get(this.requestId)
    if (stored) {
      stored.subrequestCount = this.subrequestCount
    }
  }

  /**
   * Start timing an operation
   */
  startOperation(name: string, metadata?: Record<string, unknown>): () => void {
    const entry: PerformanceEntry = {
      name,
      startTime: performance.now(),
      metadata,
    }
    this.operations.push(entry)

    // Return a function to end the operation
    return () => {
      entry.duration = performance.now() - entry.startTime
    }
  }

  /**
   * Wrap an async function with timing
   */
  async time<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    const end = this.startOperation(name, metadata)
    try {
      const result = await fn()
      end()
      return result
    } catch (error) {
      end()
      throw error
    }
  }

  /**
   * Get elapsed time since tracker creation
   */
  getElapsedTime(): number {
    return performance.now() - this.startTime
  }

  /**
   * Log current performance state (useful mid-request)
   */
  logProgress(message: string) {
    const elapsed = this.getElapsedTime()
    const slowOps = this.operations
      .filter(op => op.duration && op.duration > 50)
      .map(op => ({ name: op.name, duration: Math.round(op.duration!), ...op.metadata }))

    logger.info(message, {
      elapsedMs: Math.round(elapsed),
      subrequests: this.subrequestCount,
      operationCount: this.operations.length,
      slowOperations: slowOps.length > 0 ? slowOps : undefined,
    }, this.context)
  }

  /**
   * Generate final performance summary
   */
  getSummary() {
    const totalTime = this.getElapsedTime()
    const completedOps = this.operations.filter(op => op.duration !== undefined)
    
    // Group by operation name
    const byName: Record<string, { count: number; totalMs: number; maxMs: number }> = {}
    for (const op of completedOps) {
      if (!byName[op.name]) {
        byName[op.name] = { count: 0, totalMs: 0, maxMs: 0 }
      }
      byName[op.name].count++
      byName[op.name].totalMs += op.duration!
      byName[op.name].maxMs = Math.max(byName[op.name].maxMs, op.duration!)
    }

    // Find slowest operations
    const slowestOps = completedOps
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(op => ({
        name: op.name,
        durationMs: Math.round(op.duration!),
        ...op.metadata,
      }))

    return {
      requestId: this.requestId,
      totalTimeMs: Math.round(totalTime),
      subrequestCount: this.subrequestCount,
      operationCount: completedOps.length,
      operationsByType: Object.entries(byName).map(([name, stats]) => ({
        name,
        count: stats.count,
        totalMs: Math.round(stats.totalMs),
        avgMs: Math.round(stats.totalMs / stats.count),
        maxMs: Math.round(stats.maxMs),
      })),
      slowestOperations: slowestOps,
      // Warning thresholds for Cloudflare Workers
      warnings: {
        cpuTimeWarning: totalTime > 30000, // 30s is common limit
        subrequestWarning: this.subrequestCount > 50, // Getting close to limits
        manyOperations: completedOps.length > 100,
      },
    }
  }

  /**
   * Log final summary at request end
   */
  finish(status?: number) {
    const summary = this.getSummary()
    const logLevel = summary.warnings.cpuTimeWarning || summary.warnings.subrequestWarning
      ? "warn"
      : "info"

    const logFn = logLevel === "warn" ? logger.warn : logger.info
    logFn("Request completed", { ...summary, status }, this.context)

    // Cleanup
    requestStore.delete(this.requestId)
  }

  get id() {
    return this.requestId
  }
}

/**
 * Get tracker for current request (for use in nested functions)
 */
export function getTracker(requestId: string): PerformanceTracker | undefined {
  const stored = requestStore.get(requestId)
  if (!stored) return undefined
  
  // Reconstruct a limited tracker for logging purposes
  const tracker = new PerformanceTracker(stored.context)
  // Note: This won't have full operation history, just for logging
  return tracker
}

/**
 * Utility to create a request-scoped logger
 */
export function createRequestLogger(route: string, method: string) {
  const tracker = new PerformanceTracker({ route, method })
  
  return {
    tracker,
    requestId: tracker.id,
    debug: (msg: string, data?: Record<string, unknown>) => 
      logger.debug(msg, data, { requestId: tracker.id, route }),
    info: (msg: string, data?: Record<string, unknown>) => 
      logger.info(msg, data, { requestId: tracker.id, route }),
    warn: (msg: string, data?: Record<string, unknown>) => 
      logger.warn(msg, data, { requestId: tracker.id, route }),
    error: (msg: string, err?: unknown) => 
      logger.error(msg, err, { requestId: tracker.id, route }),
  }
}
