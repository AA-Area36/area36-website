import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { ContactClient } from "./contact-client"

export const metadata: Metadata = {
  title: "Contact | Area 36",
  description:
    "Contact Area 36 officers, committee chairs, and service positions.",
}

export default function ContactPage() {
  return (
    <ReCaptchaProvider>
      <ContactClient />
    </ReCaptchaProvider>
  )
}

