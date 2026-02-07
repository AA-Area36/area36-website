import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { ContactClient } from "./contact-client"

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ReCaptchaProvider>
        <ContactClient />
      </ReCaptchaProvider>
      <Footer />
    </div>
  )
}

