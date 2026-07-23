import { beforeAll, describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./passwords"

describe("password hashing contract", () => {
  let storedHash: string

  beforeAll(async () => {
    storedHash = await hashPassword("correct horse battery staple")
  })

  it("creates a versioned PBKDF2 hash with salt and digest", () => {
    expect(storedHash).toMatch(
      /^pbkdf2\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/,
    )
  })

  it("uses a fresh salt for the same password", async () => {
    await expect(
      hashPassword("correct horse battery staple"),
    ).resolves.not.toBe(storedHash)
  })

  it("accepts the matching password and rejects a mismatch", async () => {
    await expect(
      verifyPassword("correct horse battery staple", storedHash),
    ).resolves.toBe(true)
    await expect(
      verifyPassword("correct horse battery stapler", storedHash),
    ).resolves.toBe(false)
  })

  it("supports the legacy plaintext comparison during migration", async () => {
    await expect(verifyPassword("legacy-value", "legacy-value")).resolves.toBe(
      true,
    )
    await expect(verifyPassword("different", "legacy-value")).resolves.toBe(
      false,
    )
  })

  it("rejects malformed PBKDF2 records without throwing", async () => {
    await expect(verifyPassword("anything", "pbkdf2$broken")).resolves.toBe(
      false,
    )
    await expect(
      verifyPassword("anything", "pbkdf2$0$salt$digest"),
    ).resolves.toBe(false)
  })
})
