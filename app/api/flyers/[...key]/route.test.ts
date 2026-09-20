import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ linked: vi.fn(), reviewer: vi.fn(), flyer: vi.fn() }))
vi.mock("@/lib/db", () => ({ getDb: async () => ({ select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: mocks.linked }) }) }) }) }) }))
vi.mock("@/lib/auth/guards", () => ({ requireAreaAdminSession: mocks.reviewer }))
vi.mock("@/lib/r2", () => ({ getFlyer: mocks.flyer }))

import { GET } from "./route"

const request = () => GET(new NextRequest("https://example.test/api/flyers/flyers/event/object"), { params: Promise.resolve({ key: ["flyers", "event", "object"] }) })

describe("flyer moderation boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.reviewer.mockResolvedValue(null)
    mocks.flyer.mockResolvedValue({ body: "synthetic PDF", httpMetadata: { contentType: "application/pdf" } })
  })
  it.each(["pending", "denied"])("denies anonymous %s files before fetching R2", async status => {
    mocks.linked.mockResolvedValue([{ status }])
    const response = await request()
    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.flyer).not.toHaveBeenCalled()
  })

  it("serves approved files without consulting reviewer auth or allowing caching", async () => {
    mocks.linked.mockResolvedValue([{ status: "approved" }])
    const response = await request()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(mocks.reviewer).not.toHaveBeenCalled()
    expect(mocks.flyer).toHaveBeenCalledWith("flyers/event/object")
  })

  it.each(["pending", "denied"])("permits authenticated review of %s files without caching", async status => {
    mocks.linked.mockResolvedValue([{ status }])
    mocks.reviewer.mockResolvedValue({ user: { email: "reviewer@example.test" } })
    const response = await request()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.flyer).toHaveBeenCalledWith("flyers/event/object")
  })

  it("returns an uncached indistinguishable 404 when metadata is not linked", async () => {
    mocks.linked.mockResolvedValue([])
    const response = await request()

    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(mocks.reviewer).not.toHaveBeenCalled()
    expect(mocks.flyer).not.toHaveBeenCalled()
  })
})
