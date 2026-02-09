import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { TreatmentTCPClient } from "./treatment-client"

export const metadata: Metadata = {
  title: "Treatment TCP | Area 36",
  description:
    "Sign up as a treatment temporary contact volunteer or request a contact for someone leaving a treatment facility.",
}

export default function TreatmentTCPPage() {
  return (
    <ReCaptchaProvider>
      <TreatmentTCPClient />
    </ReCaptchaProvider>
  )
}

