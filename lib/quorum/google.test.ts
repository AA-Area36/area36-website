import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ db: vi.fn(), owner: vi.fn() }))
vi.mock("@/lib/db", () => ({ getDb: mocks.db }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { GDRIVE_QUORUM_FOLDER_ID: "fixture-root" } }) }))
vi.mock("@/lib/google/delegated-auth", () => ({ getGoogleServiceAccountAccessToken: async () => "fixture-token", clearGoogleServiceAccountToken: vi.fn() }))
vi.mock("@/lib/google/user-drive-auth", () => ({ getQuorumDriveOwnerAccessToken: mocks.owner }))
import { createQuorumEvent } from "./google"
import { QUORUM_APP_PROPERTIES } from "./constants"

describe("quorum creation reconciliation", () => {
  const attempts = new Map<string, string>()
  const input = { eventKey: "event123456789", title: "Synthetic event", eventDate: "2026-09-20", quorumTarget: 10, featured: true }
  let file: { id: string; name: string; appProperties: Record<string, string> } | null
  let initialized: boolean
  let creates: number
  let failMode: "none" | "response-loss" | "initialization" | "forbidden"
  beforeEach(() => {
    attempts.clear(); file = null; initialized = false; creates = 0; failMode = "none"
    mocks.owner.mockReset().mockResolvedValue("fixture-owner")
    mocks.db.mockResolvedValue({ $client: { prepare: (query: string) => ({ bind: (key: string, hash: string) => ({
      async first() {
        if (query.startsWith("INSERT")) { if (attempts.has(key)) return null; attempts.set(key, hash); return { event_key: key } }
        return attempts.has(key) ? { payloadHash: attempts.get(key) } : null
      },
      async run() { if (query.startsWith("DELETE")) attempts.delete(key) },
    }) }) } })
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      const body = init.body ? JSON.parse(String(init.body)) : {}
      if (url.includes("/drive/v3/files?") && init.method === "POST") {
        creates++
        if (failMode === "forbidden") { failMode = "none"; return new Response("", { status: 403 }) }
        file = { id: "fixture-sheet", name: body.name, appProperties: body.appProperties }
        if (failMode === "response-loss") { failMode = "none"; throw new Error("response lost after commit") }
        return Response.json(file)
      }
      if (url.includes("/drive/v3/files?") && !init.method) return Response.json({ files: file ? [file] : [] })
      if (url.includes("?fields=sheets.properties")) return Response.json({ sheets: initialized ? [{ properties: { sheetId: 1, title: "Config" } }] : [] })
      if (url.includes("/values:batchUpdate") && failMode === "initialization") { failMode = "none"; throw new Error("partial initialization") }
      if (url.endsWith(":batchUpdate")) { initialized = true; return Response.json({}) }
      if (init.method === "PATCH" && file) { Object.assign(file.appProperties, body.appProperties); return Response.json(file) }
      throw new Error(`Unexpected fixture request: ${url}`)
    }))
  })
  it("does not claim an attempt when owner credentials fail before create", async () => {
    mocks.owner.mockRejectedValueOnce(new Error("not connected"))
    await expect(createQuorumEvent(input)).rejects.toThrow("not connected")
    expect(attempts.size).toBe(0)
    await expect(createQuorumEvent(input)).resolves.toMatchObject({ eventKey: input.eventKey })
    expect(creates).toBe(1)
  })
  it.each(["response-loss", "initialization"] as const)("resumes %s with the same file", async mode => {
    failMode = mode
    await expect(createQuorumEvent(input)).rejects.toThrow()
    expect(file!.appProperties[QUORUM_APP_PROPERTIES.status]).toBe("initializing")
    await expect(createQuorumEvent(input)).resolves.toMatchObject({ eventKey: input.eventKey, status: "open" })
    expect(creates).toBe(1)
  })
  it("releases a definitively rejected create for a safe same-key retry", async () => {
    failMode = "forbidden"
    await expect(createQuorumEvent(input)).rejects.toThrow("403")
    expect(attempts.size).toBe(0)
    await expect(createQuorumEvent(input)).resolves.toMatchObject({ status: "open" })
  })
})
