import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCloudflareContextMock, getGmailCredentialsMock, sendEmailMock } = vi.hoisted(() => ({
  getCloudflareContextMock: vi.fn(),
  getGmailCredentialsMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: getCloudflareContextMock,
}))
vi.mock("@/lib/gmail/client", () => ({
  getGmailCredentials: getGmailCredentialsMock,
  sendEmail: sendEmailMock,
}))
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}))

import { submitNewcomerForm, submitVolunteerForm } from "./actions"

const newcomer = {
  firstName: "Ada",
  lastName: "Member",
  phone: "555-0100",
  age: "40",
  gender: "Woman",
  dischargeDate: "2026-08-15",
  city: "Minneapolis",
  zipCode: "55401",
  treatmentFacility: "Example Facility",
  treatmentFacilityPhone: "555-0101",
  treatmentFacilityAddress: "123 Main St",
  recaptchaToken: "",
}

const volunteer = {
  firstName: "Grace",
  lastName: "Member",
  phone: "555-0102",
  email: "grace@example.com",
  age: "45",
  gender: "Woman",
  city: "Saint Paul",
  zipCode: "55101",
  homeGroup: "Example Group",
  homeGroupCity: "Saint Paul",
  sobrietyDate: "2020-01-01",
  recaptchaToken: "",
}

const deliveryError =
  "We could not deliver your request. Please try again or contact ttcc@area36.org directly."

describe("Treatment TCP delivery outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "development")
    getCloudflareContextMock.mockResolvedValue({ env: {} })
    getGmailCredentialsMock.mockReturnValue({ senderEmail: "test@example.com" })
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("reports failure when both newcomer deliveries fail", async () => {
    sendEmailMock.mockResolvedValue({ success: false, error: "rejected" })

    await expect(submitNewcomerForm(newcomer)).resolves.toEqual({
      success: false,
      error: deliveryError,
    })
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
  })

  it("reports success when one newcomer recipient accepts the message", async () => {
    sendEmailMock
      .mockResolvedValueOnce({ success: false, error: "rejected" })
      .mockResolvedValueOnce({ success: true })

    await expect(submitNewcomerForm(newcomer)).resolves.toMatchObject({ success: true })
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
  })

  it("continues after one volunteer delivery throws and succeeds on the other", async () => {
    sendEmailMock
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValueOnce({ success: true })

    await expect(submitVolunteerForm(volunteer)).resolves.toMatchObject({ success: true })
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
  })

  it("reports failure when every volunteer delivery throws", async () => {
    sendEmailMock.mockRejectedValue(new Error("network failure"))

    await expect(submitVolunteerForm(volunteer)).resolves.toEqual({
      success: false,
      error: deliveryError,
    })
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
  })
})
