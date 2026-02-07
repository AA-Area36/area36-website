import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { CorrectionsTCPClient } from "./corrections-client"

export default function CorrectionsTCPPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ReCaptchaProvider>
        <CorrectionsTCPClient />
      </ReCaptchaProvider>
      <Footer />
    </div>
  )
}

