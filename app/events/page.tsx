import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { EventsLoader } from "./events-loader"

export default function EventsPage() {
  return (
    <ReCaptchaProvider>
      <EventsLoader />
    </ReCaptchaProvider>
  )
}
