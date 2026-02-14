type HashParams = {
  iterations: number
  salt: ArrayBuffer
}

const textEncoder = new TextEncoder()
const DEFAULT_ITERATIONS = 100_000
const WEBCRYPTO_PBKDF2_ITERATION_LIMIT = 100_000
const KEY_LENGTH_BYTES = 32
const SALT_LENGTH_BYTES = 16

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function deriveKey(plain: string, params: HashParams): Promise<Uint8Array> {
  const keyMaterial = textEncoder.encode(plain)
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  try {
    if (params.iterations <= WEBCRYPTO_PBKDF2_ITERATION_LIMIT) {
      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: params.salt,
          iterations: params.iterations,
        },
        key,
        KEY_LENGTH_BYTES * 8
      )
      return new Uint8Array(bits)
    }
  } catch (error) {
    // Some runtimes throw when PBKDF2 iterations exceed engine limits.
    if (!(error instanceof Error && error.name === "NotSupportedError")) {
      throw error
    }
  }

  // Compatibility fallback for runtimes that cap PBKDF2 iterations in deriveBits.
  // This implements PBKDF2-HMAC-SHA256 directly and supports high iteration counts.
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const salt = new Uint8Array(params.salt)
  const blockInput = new Uint8Array(salt.length + 4)
  blockInput.set(salt, 0)
  // Block index 1 in big-endian for dkLen <= hashLen (32 bytes).
  blockInput[salt.length] = 0
  blockInput[salt.length + 1] = 0
  blockInput[salt.length + 2] = 0
  blockInput[salt.length + 3] = 1

  let u = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, blockInput))
  const output = new Uint8Array(u)

  for (let i = 1; i < params.iterations; i++) {
    u = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, u))
    for (let j = 0; j < output.length; j++) {
      output[j] ^= u[j]
    }
  }

  return output
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const iterations = DEFAULT_ITERATIONS
  const hash = await deriveKey(plain, { iterations, salt: toArrayBuffer(salt) })

  const saltB64 = base64UrlEncode(salt)
  const hashB64 = base64UrlEncode(hash)
  return `pbkdf2$${iterations}$${saltB64}$${hashB64}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("pbkdf2$")) {
    return timingSafeEqual(plain, stored)
  }

  const parts = stored.split("$")
  if (parts.length !== 4) return false

  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations <= 0) return false

  const salt = base64UrlDecode(parts[2])
  const expected = parts[3]

  const derived = await deriveKey(plain, { iterations, salt: toArrayBuffer(salt) })
  const derivedB64 = base64UrlEncode(derived)
  return timingSafeEqual(derivedB64, expected)
}
