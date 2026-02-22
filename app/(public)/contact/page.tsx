import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { ContactClient } from "./contact-client"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Contact | Area 36",
  description:
    "Contact Area 36 officers, committee chairs, and service positions.",
}

export default async function ContactPage() {
  const locale = await getRequestLocale()
  const contactContent = await getContent("contact", locale)
  const { t } = createTranslator(contactContent)

  return (
    <ReCaptchaProvider>
      <ContactClient
        content={contactContent}
        fallbackHeader={{
          title: t("header.title", "Contact Us"),
          description: t(
            "header.description",
            "Have questions about Area 36 or general service? Select who you'd like to contact and send us a message.",
          ),
        }}
      />
    </ReCaptchaProvider>
  )
}
