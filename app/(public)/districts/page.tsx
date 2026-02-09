import type { Metadata } from "next"
import { getContent } from "@/lib/content/repo"
import { type ContentDoc } from "@/lib/content/schema"
import { getRequestLocale } from "@/lib/i18n/get-locale"
import { DistrictsClient } from "./districts-client"

export const metadata: Metadata = {
  title: "Districts | Area 36",
  description:
    "Explore the 27 districts of Area 36 and find your local DCM and district meetings.",
}

export default async function DistrictsPage() {
  const locale = await getRequestLocale()
  const content = (await getContent("districts", locale)) as ContentDoc

  return <DistrictsClient content={content} />
}

