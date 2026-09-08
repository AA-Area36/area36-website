import { afterEach, describe, expect, it, vi } from "vitest"

const { appendAreaAssemblyRegistration, checkRateLimit, getClientIp } = vi.hoisted(() => ({
  appendAreaAssemblyRegistration: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}))

vi.mock("@/lib/google/sheets", () => ({ appendAreaAssemblyRegistration }))
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit, getClientIp }))

import {
  AREA_ASSEMBLY_REGISTRATION_CLOSES_AT,
  isAreaAssemblyRegistrationClosed,
  submitAreaAssemblyRegistration,
} from "./actions"

describe("April 2026 Area Assembly registration window", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("is open immediately before the cutoff", () => {
    expect(isAreaAssemblyRegistrationClosed(AREA_ASSEMBLY_REGISTRATION_CLOSES_AT - 1)).toBe(false)
  })

  it("closes exactly at the cutoff", () => {
    expect(isAreaAssemblyRegistrationClosed(AREA_ASSEMBLY_REGISTRATION_CLOSES_AT)).toBe(true)
  })

  it("stays closed after the cutoff", () => {
    expect(isAreaAssemblyRegistrationClosed(AREA_ASSEMBLY_REGISTRATION_CLOSES_AT + 1)).toBe(true)
  })

  it("rejects archived submissions before rate limiting or external writes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"))

    await expect(
      submitAreaAssemblyRegistration({
        firstName: "A",
        lastInitial: "B",
        attendingApril18: true,
        attendingApril18InPerson: false,
        attendingApril21: false,
        recaptchaToken: "unused",
      })
    ).resolves.toEqual({
      success: false,
      error: "Registration for the April 2026 Area Assembly is closed.",
    })
    expect(getClientIp).not.toHaveBeenCalled()
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(appendAreaAssemblyRegistration).not.toHaveBeenCalled()
  })
})
