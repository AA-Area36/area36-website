import { expect, it, vi } from "vitest"
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { GDRIVE_SERVICE_ACCOUNT_EMAIL: "fixture", GDRIVE_PRIVATE_KEY: "fixture", GDRIVE_PRIVATE_KEY_ID: "fixture" } }) }))
import { GET } from "./route"
it("checks configuration without issuing upstream requests", async () => {
  const fetch = vi.spyOn(globalThis, "fetch")
  try {
    const response = await GET()
    expect(await response.json()).toMatchObject({ ok: true, configured: true, check: "configuration" })
    expect(fetch).not.toHaveBeenCalled()
  } finally { fetch.mockRestore() }
})
