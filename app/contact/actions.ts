"use server"

import { contactFormSchema, type ContactFormData } from "@/lib/schemas/contact"

interface HCaptchaResponse {
  success: boolean
  "error-codes"?: string[]
}

export async function submitContactForm(data: ContactFormData) {
  // Validate the form data
  const result = contactFormSchema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  // Verify hCaptcha token
  const secretKey = process.env.HCAPTCHA_SECRET_KEY

  if (!secretKey) {
    console.error("HCAPTCHA_SECRET_KEY is not configured")
    return {
      success: false,
      error: "Server configuration error. Please try again later.",
    }
  }

  try {
    const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: result.data.hcaptchaToken,
      }),
    })

    const verifyResult: HCaptchaResponse = await verifyResponse.json()

    if (!verifyResult.success) {
      console.error("hCaptcha verification failed:", verifyResult["error-codes"])
      return {
        success: false,
        error: "Captcha verification failed. Please try again.",
      }
    }

    // TODO: Send email or store form submission
    // For now, just log and return success
    console.log("Contact form submission:", {
      recipient: result.data.recipient,
      name: `${result.data.firstName} ${result.data.lastName}`,
      email: result.data.email,
      subject: result.data.subject,
    })

    return {
      success: true,
      message: "Your message has been sent successfully. We will get back to you soon.",
    }
  } catch (error) {
    console.error("Contact form submission error:", error)
    return {
      success: false,
      error: "An error occurred while sending your message. Please try again.",
    }
  }
}
