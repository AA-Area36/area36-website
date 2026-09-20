import { beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ create: vi.fn(), feature: vi.fn(), invalidate: vi.fn() }))
vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }))
vi.mock("@/lib/auth/guards", () => ({ requireQuorumWriteSession: async () => ({ user: { email: "fixture@example.test" } }) }))
vi.mock("@/lib/quorum/google", () => ({ createQuorumEvent: mocks.create, setQuorumEventFeatured: mocks.feature }))
vi.mock("@/lib/cache/edge-cache", () => ({ invalidateEdgeCache: mocks.invalidate }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { createQuorumEventAction } from "@/app/admin/(dashboard)/quorum/actions"
beforeEach(() => {
  mocks.create.mockResolvedValue({ eventKey: "event123456789" })
  mocks.feature.mockReset().mockResolvedValue(undefined)
  mocks.invalidate.mockReset().mockResolvedValue(undefined)
})
it.each(["feature", "cache"])("returns committed creation and warning after %s failure", async failure => {
  ;(failure === "feature" ? mocks.feature : mocks.invalidate).mockRejectedValue(new Error("fixture outage"))
  expect(await createQuorumEventAction({ title: "Synthetic event", eventDate: "2026-09-20", quorumTarget: 10, featured: true }, "event123456789")).toMatchObject({ success: true, eventKey: "event123456789", warning: expect.stringContaining("Do not create it again") })
})
