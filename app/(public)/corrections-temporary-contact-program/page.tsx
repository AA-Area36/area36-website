import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { CorrectionsTCPClient } from "./corrections-client"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Corrections TCP | Area 36",
  description:
    "Sign up as a corrections temporary contact volunteer or request a contact for someone leaving a correctional facility.",
}

export default async function CorrectionsTCPPage() {
  const locale = await getRequestLocale()
  const correctionsContent = await getContent("correctionsTcp", locale)
  const { t } = createTranslator(correctionsContent)

  return (
    <ReCaptchaProvider>
      <CorrectionsTCPClient
        content={correctionsContent}
        fallbackHeader={{
          badge: t("header.badge", "Corrections"),
          title: t("header.title", "Corrections Temporary Contact Program"),
          description: t(
            "header.description",
            "Helping alcoholics transition from correctional facilities to the A.A. community.",
          ),
          backLinkLabel: t("header.backLinkLabel", "Back to Temporary Contact Programs"),
        }}
      />
    </ReCaptchaProvider>
  )
}
