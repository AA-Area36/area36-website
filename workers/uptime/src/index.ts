interface Env {
  DB: D1Database
  SITE_BASE_URL?: string
  UPTIME_ENDPOINTS?: string
}

const DEFAULT_ENDPOINTS = ["/", "/api/healthz", "/api/gdrive/newsletters"]
const TIMEOUT_MS = 10_000

function parseEndpoints(env: Env): string[] {
  if (!env.UPTIME_ENDPOINTS) return DEFAULT_ENDPOINTS
  try {
    const parsed = JSON.parse(env.UPTIME_ENDPOINTS)
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed as string[]
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_ENDPOINTS
}

function normalizeBase(base?: string): string {
  if (!base) return ""
  return base.endsWith("/") ? base.slice(0, -1) : base
}

function buildUrl(base: string, endpoint: string): string | null {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint
  }
  if (!base) return null
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${base}${path}`
}

async function probe(url: string): Promise<{ ok: boolean; status: number; latencyMs: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = Date.now()

  try {
    const response = await fetch(url, { signal: controller.signal })
    const latencyMs = Date.now() - start
    const status = response.status
    const ok = status >= 200 && status < 400
    return { ok, status, latencyMs }
  } catch {
    const latencyMs = Date.now() - start
    return { ok: false, status: 0, latencyMs }
  } finally {
    clearTimeout(timer)
  }
}

async function upsertUptime(
  env: Env,
  day: string,
  endpoint: string,
  result: { ok: boolean; status: number; latencyMs: number }
) {
  const checkedAt = new Date().toISOString()
  const checksOk = result.ok ? 1 : 0

  await env.DB.prepare(
    `INSERT INTO uptime_daily (
      day, endpoint, checks_total, checks_ok, latency_ms_sum, latency_ms_max, last_status, last_checked_at
    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(day, endpoint) DO UPDATE SET
      checks_total = checks_total + 1,
      checks_ok = checks_ok + excluded.checks_ok,
      latency_ms_sum = latency_ms_sum + excluded.latency_ms_sum,
      latency_ms_max = MAX(latency_ms_max, excluded.latency_ms_max),
      last_status = excluded.last_status,
      last_checked_at = excluded.last_checked_at`
  )
    .bind(day, endpoint, checksOk, result.latencyMs, result.latencyMs, result.status, checkedAt)
    .run()
}

export default {
  async scheduled(_: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const base = normalizeBase(env.SITE_BASE_URL)
    const endpoints = parseEndpoints(env)
    const day = new Date().toISOString().slice(0, 10)

    const targets = endpoints
      .map((endpoint) => buildUrl(base, endpoint))
      .filter((url): url is string => url !== null)

    for (const url of targets) {
      ctx.waitUntil(
        (async () => {
          const result = await probe(url)
          await upsertUptime(env, day, url, result)
        })()
      )
    }

    if (targets.length === 0) {
      console.warn("No valid endpoints to probe. Check SITE_BASE_URL or UPTIME_ENDPOINTS.")
    }
  },
}
