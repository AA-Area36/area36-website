import { beforeEach, describe, expect, it, vi } from "vitest"
const { getContent } = vi.hoisted(() => ({ getContent: vi.fn() }))
vi.mock("@/lib/content/repo", () => ({ getContent }))
import { GET } from "./route"
beforeEach(() => { getContent.mockReset().mockResolvedValue({ directory: [{ number: 24, name: "Synthetic district", meetingDay: "5th Wednesday" }] }) })
describe("bounded district range", () => {
  it.each(["start=2026-02-31&end=2026-03-01", "start=2026-09-30&end=2026-09-01", "start=2026-01-01&end=2045-12-31"])("rejects invalid/oversized ranges before reading content", async (query) => {
    expect((await GET(new Request(`https://example.test/api/district-meetings?${query}`))).status).toBe(400)
    expect(getContent).not.toHaveBeenCalled()
  })
  it("includes the final requested day and handles malformed locale cookies", async () => {
    const response = await GET(new Request("https://example.test/api/district-meetings?start=2026-09-01&end=2026-09-30", { headers: { cookie: "a36_locale=%" } }))
    expect(response.status).toBe(200)
    expect(((await response.json()) as Array<{ date: string }>).map((event) => event.date)).toEqual(["2026-09-30"])
    expect(response.headers.get("cache-control")).toContain("private")
  })
})
