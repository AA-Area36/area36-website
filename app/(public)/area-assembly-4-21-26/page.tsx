import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { AreaAssemblyClient } from "./area-assembly-client"

export const metadata: Metadata = {
  title: "Area Assembly / Delegates Workshop | Area 36",
  description:
    "Register for the Area Assembly / Delegates workshop, then review the linked General Service Conference background material.",
}

export default function AreaAssemblyRegistrationPage() {
  return (
    <ReCaptchaProvider>
      <AreaAssemblyClient />
    </ReCaptchaProvider>
  )
}
