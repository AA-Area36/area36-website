import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { TreatmentTCPClient } from "./treatment-client"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Treatment TCP | Area 36",
  description:
    "Sign up as a treatment temporary contact volunteer or request a contact for someone leaving a treatment facility.",
}

export default async function TreatmentTCPPage() {
  const locale = await getRequestLocale()
  const treatmentContent = await getContent("treatmentTcp", locale)
  const { t } = createTranslator(treatmentContent)

  return (
    <ReCaptchaProvider>
      <TreatmentTCPClient
        content={treatmentContent}
        fallbackHeader={{
          badge: t("header.badge", "Treatment"),
          title: t("header.title", "Treatment Temporary Contact Program"),
          description: t(
            "header.description",
            "Many A.A. members can tell you that, even though we were aware of Alcoholics Anonymous in treatment, we were too fearful to go alone. In order to bridge the gap between the treatment facility and A.A. community, A.A. members have volunteered to be temporary contacts for 30 to 90 days to introduce you to our Alcoholics Anonymous community.",
          ),
          secondaryDescription: t(
            "header.secondaryDescription",
            "We cannot emphasize enough the importance of having a temporary contact as the essential link between treatment and recovering from alcoholism.",
          ),
          backLinkLabel: t("header.backLinkLabel", "Back to Temporary Contact Programs"),
        }}
      />
    </ReCaptchaProvider>
  )
}
