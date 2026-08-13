import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { FinalReportOrderBanner } from "@/components/final-report-order-banner"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner />
      <Header />
      <FinalReportOrderBanner />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Breadcrumbs />
        {children}
      </main>
      <Footer />
    </div>
  )
}
