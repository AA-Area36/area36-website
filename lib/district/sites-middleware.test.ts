import { expect, it, vi } from "vitest"
it("does not negative-cache a transient district configuration failure", async () => {
  vi.resetModules()
  const { getDistrictSiteForMiddleware } = await import("./sites-middleware")
  const first = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue({ enabled: 1, mode: "hosted" })
  const env = { DB: { prepare: () => ({ bind: () => ({ first }) }) } } as unknown as { DB: D1Database }
  await expect(getDistrictSiteForMiddleware(env, 24)).rejects.toThrow("unavailable")
  await expect(getDistrictSiteForMiddleware(env, 24)).resolves.toMatchObject({ enabled: true, mode: "hosted" })
  expect(first).toHaveBeenCalledTimes(2)
})
