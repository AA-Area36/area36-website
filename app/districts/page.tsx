import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getContent } from "@/lib/content/repo"
import { type ContentDoc } from "@/lib/content/schema"
import { getRequestLocale } from "@/lib/i18n/get-locale"
import { DistrictsClient } from "./districts-client"

export default async function DistrictsPage() {
  const locale = await getRequestLocale()
  const content = (await getContent("districts", locale)) as ContentDoc

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DistrictsClient content={content} />
      <Footer />
    </div>
  )
}

