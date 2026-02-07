import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { TreatmentTCPClient } from "./treatment-client"

export default function TreatmentTCPPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ReCaptchaProvider>
        <TreatmentTCPClient />
      </ReCaptchaProvider>
      <Footer />
    </div>
  )
}

