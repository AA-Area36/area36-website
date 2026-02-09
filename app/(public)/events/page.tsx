import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { EventsLoader } from "./events-loader"

export const metadata: Metadata = {
  title: "Events | Area 36",
  description:
    "Stay connected with Area 36 assemblies, workshops, and service events throughout southern Minnesota.",
}

export default function EventsPage() {
  return (
    <ReCaptchaProvider>
      <EventsLoader />
    </ReCaptchaProvider>
  )
}
