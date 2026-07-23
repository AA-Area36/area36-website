import { afterEach, describe, expect, it, vi } from "vitest"

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: headersMock,
}))

import {
  createLocalAdminBypassSession,
  isLocalAdminBypassEnabled,
} from "./dev-bypass"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("local admin bypass boundary", () => {
  it("cannot be enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("LOCAL_ADMIN_BYPASS", "1")

    await expect(isLocalAdminBypassEnabled()).resolves.toBe(false)
    expect(headersMock).not.toHaveBeenCalled()
  })

  it("honors an explicit off switch on a local non-production host", async () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("LOCAL_ADMIN_BYPASS", "0")
    headersMock.mockResolvedValue(new Headers({ host: "localhost:3000" }))

    await expect(isLocalAdminBypassEnabled()).resolves.toBe(false)
    expect(headersMock).not.toHaveBeenCalled()
  })

  it("allows the explicit non-production opt-in", async () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("LOCAL_ADMIN_BYPASS", "1")

    await expect(isLocalAdminBypassEnabled()).resolves.toBe(true)
  })

  it("limits the fallback to loopback hosts", async () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("LOCAL_ADMIN_BYPASS", "")
    headersMock.mockResolvedValueOnce(
      new Headers({ host: "127.0.0.1:3000" }),
    )
    await expect(isLocalAdminBypassEnabled()).resolves.toBe(true)

    headersMock.mockResolvedValueOnce(new Headers({ host: "preview.example" }))
    await expect(isLocalAdminBypassEnabled()).resolves.toBe(false)
  })

  it("creates an Area-admin session for every valid service district", () => {
    const session = createLocalAdminBypassSession()

    expect(session.user.isAreaAdmin).toBe(true)
    expect(session.user.districtAdminFor).toHaveLength(26)
    expect(session.user.districtAdminFor).not.toContain(10)
  })
})
