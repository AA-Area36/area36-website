// @vitest-environment node

import { createServer, type Server } from "node:http"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness, type TestHarness } from "wrangler"

interface UptimeEnv {
  DB: D1Database
}

describe("uptime Worker with local D1", () => {
  let probeServer: Server
  let probeBaseUrl: string
  let harness: TestHarness

  beforeAll(async () => {
    probeServer = createServer((_request, response) => {
      response.writeHead(204)
      response.end()
    })
    await new Promise<void>((resolve, reject) => {
      probeServer.once("error", reject)
      probeServer.listen(0, "127.0.0.1", resolve)
    })

    const address = probeServer.address()
    if (!address || typeof address === "string") {
      throw new Error("Could not determine the local probe server address")
    }
    probeBaseUrl = `http://127.0.0.1:${address.port}`

    harness = createTestHarness({
      root: process.cwd(),
      workers: [
        {
          configPath: "workers/uptime/wrangler.jsonc",
          vars: {
            SITE_BASE_URL: probeBaseUrl,
            UPTIME_ENDPOINTS: '["/healthy"]',
          },
        },
      ],
    })
    await harness.listen()

    const env = await harness.getWorker<UptimeEnv>().getEnv()
    await env.DB.prepare(`CREATE TABLE uptime_daily (
      day TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      checks_total INTEGER NOT NULL DEFAULT 0,
      checks_ok INTEGER NOT NULL DEFAULT 0,
      latency_ms_sum INTEGER NOT NULL DEFAULT 0,
      latency_ms_max INTEGER NOT NULL DEFAULT 0,
      last_status INTEGER,
      last_checked_at TEXT,
      PRIMARY KEY (day, endpoint)
    )`).run()
  }, 30_000)

  afterAll(async () => {
    await harness?.close()
    await new Promise<void>((resolve, reject) => {
      if (!probeServer?.listening) return resolve()
      probeServer.close((error) => (error ? reject(error) : resolve()))
    })
  })

  it("executes a scheduled probe and persists the result", async () => {
    const outcome = await harness.getWorker<UptimeEnv>().scheduled({
      cron: "0 * * * *",
      scheduledTime: new Date("2026-08-05T12:00:00Z"),
    })
    expect(outcome.outcome).toBe("ok")

    const env = await harness.getWorker<UptimeEnv>().getEnv()
    const row = await env.DB.prepare(
      "SELECT endpoint, checks_total, checks_ok, last_status FROM uptime_daily"
    ).first<{
      endpoint: string
      checks_total: number
      checks_ok: number
      last_status: number
    }>()

    expect(row).toEqual({
      endpoint: `${probeBaseUrl}/healthy`,
      checks_total: 1,
      checks_ok: 1,
      last_status: 204,
    })
  }, 30_000)
})
