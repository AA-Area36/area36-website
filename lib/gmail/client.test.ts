import { beforeEach, describe, expect, it, vi } from "vitest"
const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }))
vi.mock("./auth", () => ({ getAccessToken, clearTokenCache: vi.fn() }))
import { createEmailMessage, sendEmail } from "./client"

beforeEach(() => vi.clearAllMocks())
describe("email header boundary", () => {
  it.each(["notice\r\nBcc: other@example.test", "notice\nX-Header: yes", "notice\u0000"])("rejects control characters before obtaining a token", async (subject) => {
    const response = await sendEmail({ clientEmail: "service@example.test", privateKey: "synthetic", privateKeyId: "synthetic", senderEmail: "sender@example.test" }, { to: "expected@example.test", subject, body: "Test" })
    expect(response.success).toBe(false)
    expect(getAccessToken).not.toHaveBeenCalled()
  })
  it("rejects recipient and reply-to injection centrally", () => {
    expect(() => createEmailMessage("from@example.test", "to@example.test\r\nBcc: injected@example.test", "Hello", { body: "Test" })).toThrow("Invalid email header")
    expect(() => createEmailMessage("from@example.test", "to@example.test", "Hello", { body: "Test", replyTo: "reply@example.test\nBcc: injected@example.test" })).toThrow("Invalid email header")
  })
  it("round-trips Unicode subjects using folded RFC 2047 encoded words", () => {
    const subject = "Area 36 — réunion 🎉 ".repeat(8)
    const raw = createEmailMessage("from@example.test", "to@example.test", subject, { body: "Test" })
    const decoded = [...raw.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0)))).join("")
    expect(decoded).toBe(subject)
    expect(raw.split("\r\n").filter((line) => /^(To|Cc|Bcc):/.test(line))).toEqual(["To: to@example.test"])
  })
})
