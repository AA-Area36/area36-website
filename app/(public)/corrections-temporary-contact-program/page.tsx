import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { CorrectionsTCPClient } from "./corrections-client"

export const metadata: Metadata = {
  title: "Corrections TCP | Area 36",
  description:
    "Sign up as a corrections temporary contact volunteer or request a contact for someone leaving a correctional facility.",
}

export default function CorrectionsTCPPage() {
  return (
    <ReCaptchaProvider>
      <CorrectionsTCPClient />
    </ReCaptchaProvider>
  )
}

