import { afterEach, beforeEach, expect, it, vi } from "vitest"
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn().mockRejectedValue(new Error("local")) }))
import { verifyRecaptcha } from "./recaptcha"
beforeEach(() => { vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("RECAPTCHA_SECRET_KEY", "synthetic"); })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it.each([{ success: true, action: "submit_event" }, { success: true, score: 0.9, action: "other" }, { success: true, score: 0.1, action: "submit_event" }])("rejects invalid captcha context before accepting request", async (result) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(result)))
  expect(await verifyRecaptcha("synthetic", "submit_event")).toMatchObject({ success: false })
})
it("accepts only matching scored context", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true, score: 0.9, action: "submit_event" })))
  expect(await verifyRecaptcha("synthetic", "submit_event")).toEqual({ success: true })
})
