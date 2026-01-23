"use client"

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3"

export function ReCaptchaProvider({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!siteKey) {
    // In development, if no key is set, just render children without the provider
    console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured")
    return <>{children}</>
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      {children}
    </GoogleReCaptchaProvider>
  )
}
