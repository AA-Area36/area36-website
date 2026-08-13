import { getCloudflareContext } from "@opennextjs/cloudflare"

type ReCaptchaResponse = {
  success: boolean
  score?: number
  action?: string
  "error-codes"?: string[]
}

const SCORE_THRESHOLD = 0.5

async function getSecret(): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    if (env.RECAPTCHA_SECRET_KEY) return env.RECAPTCHA_SECRET_KEY
  } catch {
    // Fall back to process env outside Cloudflare.
  }
  return process.env.RECAPTCHA_SECRET_KEY
}

export async function verifyRecaptcha(
  token: string,
  expectedAction: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (process.env.NODE_ENV === "development") return { success: true }
  if (!token) return { success: false, error: "Security verification is missing. Refresh and try again." }
  const secret = await getSecret()
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY is not configured")
    return { success: false, error: "The form is temporarily unavailable." }
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8_000),
    })
    const result = (await response.json()) as ReCaptchaResponse
    if (
      !result.success ||
      typeof result.score !== "number" ||
      result.score < SCORE_THRESHOLD ||
      result.action !== expectedAction
    ) {
      return { success: false, error: "Security verification failed. Refresh and try again." }
    }
    return { success: true }
  } catch (error) {
    console.error("reCAPTCHA verification failed", error)
    return { success: false, error: "Security verification failed. Refresh and try again." }
  }
}
