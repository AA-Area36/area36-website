type HashParams = {
  iterations: number
  salt: Uint8Array
}

const textEncoder = new TextEncoder()
const DEFAULT_ITERATIONS = 120_000
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
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
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

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const iterations = DEFAULT_ITERATIONS
  const hash = await deriveKey(plain, { iterations, salt })

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

  const derived = await deriveKey(plain, { iterations, salt })
  const derivedB64 = base64UrlEncode(derived)
  return timingSafeEqual(derivedB64, expected)
}
