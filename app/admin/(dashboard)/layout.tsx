import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays, LogOut, Shield, TrendingUp, Mic, Files, FileText, Languages } from "lucide-react"
import { createRequestLogger } from "@/lib/logger"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const log = createRequestLogger("/admin", "GET")
  const session = await log.tracker.time("auth", () => auth())

  // If not authenticated, redirect to login
  if (!session?.user) {
    log.warn("Admin access denied")
    log.tracker.finish(302)
    redirect("/admin/login")
  }
  log.tracker.finish(200)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2 font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                <span>Area 36 Admin</span>
              </Link>
              <nav className="hidden sm:flex items-center gap-4">
                <Link
                  href="/admin/events"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CalendarDays className="h-4 w-4" />
                  Events
                </Link>
                <Link
                  href="/admin/subscription-drives"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  Subscription Drives
                </Link>
                <Link
                  href="/admin/recordings"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mic className="h-4 w-4" />
                  Recordings
                </Link>
                <Link
                  href="/admin/files"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Files className="h-4 w-4" />
                  Files
                </Link>
                <Link
                  href="/admin/reports"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Reports
                </Link>
                <Link
                  href="/admin/content"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Languages className="h-4 w-4" />
                  Content
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground hidden sm:block">
                {session.user.email}
              </div>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
