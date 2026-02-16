import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { AnnouncementBanner } from "@/components/announcement-banner"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner />
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumbs />
        {children}
      </main>
      <Footer />
    </div>
  )
}
