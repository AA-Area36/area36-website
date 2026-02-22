import type { Metadata } from "next"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { EventsLoader } from "./events-loader"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Events | Area 36",
  description:
    "Stay connected with Area 36 assemblies, workshops, and service events throughout southern Minnesota.",
}

export default async function EventsPage() {
  const locale = await getRequestLocale()
  const eventsContent = await getContent("events", locale)
  const { t } = createTranslator(eventsContent)

  return (
    <ReCaptchaProvider>
      <EventsLoader
        hero={{
          title: t("hero.title", "Events Calendar"),
          description: t(
            "hero.description",
            "Stay connected with Area 36 assemblies, workshops, and service events throughout southern Minnesota.",
          ),
        }}
      />
    </ReCaptchaProvider>
  )
}
