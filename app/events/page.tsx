import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { EventsLoader } from "./events-loader"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function EventsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ReCaptchaProvider>
        <EventsLoader />
      </ReCaptchaProvider>
      <Footer />
    </div>
  )
}
