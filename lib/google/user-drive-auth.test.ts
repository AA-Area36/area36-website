// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { getQuorumDriveOwnerAccessToken } from "./user-drive-auth"

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn(() => { throw new Error("No request context") }) }))

describe("Drive owner authorization for background jobs", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  it("uses explicit Worker bindings without needing a Next request context", async () => {
    const env = { QUORUM_DRIVE_OWNER_EMAIL: "area@example.org", DB: { prepare: () => ({ bind: () => ({ first: async () => ({ id: "account", accessToken: "cached-token", refreshToken: "refresh", scope: "https://www.googleapis.com/auth/drive.file", expiresAt: Math.floor(Date.now() / 1000) + 3600 }) }) }) } } as unknown as CloudflareEnv
    expect(await getQuorumDriveOwnerAccessToken(false, env)).toBe("cached-token")
  })
  it("refreshes using the local OAuth configuration when dev bindings omit credentials", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "local-client")
    vi.stubEnv("AUTH_GOOGLE_SECRET", "local-secret")
    const update = vi.fn(async () => ({ success: true }))
    const env = { QUORUM_DRIVE_OWNER_EMAIL: "area@example.org", DB: { prepare: (sql: string) => ({ bind: () => sql.startsWith("UPDATE") ? { run: update } : { first: async () => ({ id: "account", accessToken: null, refreshToken: "refresh", scope: "https://www.googleapis.com/auth/drive.file", expiresAt: 0 }) } }) } } as unknown as CloudflareEnv
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ access_token: "fresh-token", expires_in: 3600 })))
    vi.stubGlobal("fetch", fetchMock)
    expect(await getQuorumDriveOwnerAccessToken(false, env)).toBe("fresh-token")
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams
    expect(body.get("client_id")).toBe("local-client")
    expect(body.get("client_secret")).toBe("local-secret")
    expect(update).toHaveBeenCalledOnce()
  })
})
