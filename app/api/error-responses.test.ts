import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { internalMarker, recordError } = vi.hoisted(() => ({
  internalMarker:
    "SQLITE_ERROR private-path /Users/example secret-service-account@example.test",
  recordError: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: {
      GDRIVE_SERVICE_ACCOUNT_EMAIL: "configured@example.test",
      GDRIVE_PRIVATE_KEY: "configured",
      GDRIVE_PRIVATE_KEY_ID: "configured",
    },
  }),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@example.test" } }),
}))

vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockRejectedValue(new Error(internalMarker)),
}))

vi.mock("@/lib/gdrive/auth", () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error(internalMarker)),
}))

vi.mock("@/lib/gdrive/client", () => ({
  getGDriveCredentials: vi.fn().mockReturnValue({}),
}))

vi.mock("@/lib/gdrive/cache", () => ({
  withCache: vi.fn().mockRejectedValue(new Error(internalMarker)),
}))

vi.mock("@/lib/cache/edge-cache", () => ({
  withEdgeCache: vi.fn(
    async (_key: string, loader: () => Promise<unknown>) => ({
      data: await loader(),
      status: "miss",
    }),
  ),
}))

vi.mock("@/lib/logger", () => ({
  createRequestLogger: vi.fn((route: string) => ({
    requestId: `request-${route.replaceAll("/", "-")}`,
    tracker: {
      time: async (_name: string, operation: () => Promise<unknown>) => operation(),
      finish: vi.fn(),
    },
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock("@/lib/monitoring/errors", () => ({ recordError }))

import { GET as getAdminFiles } from "./admin/files/route"
import { GET as getEvents } from "./events/route"
import { GET as getPastEvents } from "./events/past/route"
import { GET as getGDriveHealth } from "./gdrive/route"
import { GET as getGDriveType } from "./gdrive/[type]/route"

async function expectRedactedFailure(
  response: Response,
  expectedMessage: string,
): Promise<void> {
  const bodyText = await response.text()
  const body = JSON.parse(bodyText) as { error: string; requestId: string }

  expect(response.status).toBeGreaterThanOrEqual(500)
  expect(body.error).toBe(expectedMessage)
  expect(body.requestId).toBeTruthy()
  expect(response.headers.get("x-request-id")).toBe(body.requestId)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(bodyText).not.toContain(internalMarker)
}

describe("public API failures", () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    recordError.mockClear()
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    const renderedLogs = consoleError.mock.calls.flat().join(" ")
    expect(renderedLogs).not.toContain(internalMarker)
    consoleError.mockRestore()
  })

  it("redacts the general Google Drive probe", async () => {
    await expectRedactedFailure(
      await getGDriveHealth(),
      "Google Drive is temporarily unavailable.",
    )
  })

  it("redacts typed Google Drive failures", async () => {
    await expectRedactedFailure(
      await getGDriveType(
        new NextRequest("https://area36.org/api/gdrive/resources"),
        { params: Promise.resolve({ type: "resources" }) },
      ),
      "Files are temporarily unavailable.",
    )
  })

  it("redacts current and past event database failures", async () => {
    await expectRedactedFailure(
      await getEvents(new Request("https://area36.org/api/events")),
      "Events are temporarily unavailable.",
    )
    await expectRedactedFailure(
      await getPastEvents(new Request("https://area36.org/api/events/past")),
      "Past events are temporarily unavailable.",
    )
  })

  it("redacts authenticated admin-file failures", async () => {
    await expectRedactedFailure(
      await getAdminFiles(
        new NextRequest("https://area36.org/api/admin/files"),
      ),
      "Failed to fetch files.",
    )
  })

  it("stores only route-level monitoring messages", async () => {
    await getEvents(new Request("https://area36.org/api/events"))
    await getGDriveType(
      new NextRequest("https://area36.org/api/gdrive/resources"),
      { params: Promise.resolve({ type: "resources" }) },
    )

    expect(recordError).toHaveBeenCalledTimes(2)
    for (const [entry] of recordError.mock.calls) {
      expect(entry.messageOverride).toMatch(/API (request )?failed/)
      expect(entry.messageOverride).not.toContain(internalMarker)
    }
  })
})
