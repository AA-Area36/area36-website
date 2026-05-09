import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { ConferenceManualCountClient } from "./conference-manual-count-client"

export const metadata: Metadata = {
  title: "Conference Manual Count | Area 36",
  description: "Submit how many Conference Manuals you want to purchase this year by June 1.",
}

export default function ConferenceManualCountPage() {
  return (
    <ReCaptchaProvider>
      <ConferenceManualCountClient />
    </ReCaptchaProvider>
  )
}
