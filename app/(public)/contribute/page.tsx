import type { Metadata } from "next"
import { ContributeClient } from "./contribute-client"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Contribute | Area 36",
  description:
    "Support Area 36 through the Seventh Tradition. Learn how to contribute to A.A. General Service in southern Minnesota.",
}

export default async function ContributePage() {
  const locale = await getRequestLocale()
  const contributeContent = await getContent("contribute", locale)
  const { t } = createTranslator(contributeContent)

  return (
    <ContributeClient
      content={contributeContent}
      fallbackHeader={{
        title: t("header.title", "Contribute"),
        description: t(
          "header.description",
          "Supporting Area 36 through the Seventh Tradition helps carry the message of Alcoholics Anonymous throughout southern Minnesota.",
        ),
      }}
    />
  )
}
