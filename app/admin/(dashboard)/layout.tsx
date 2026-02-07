import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Shield } from "lucide-react"
import { createRequestLogger } from "@/lib/logger"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { AdminNav } from "@/components/admin-nav"

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

  // Query pending events count
  const db = await getDb()
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.status, "pending"))
  const pendingEventsCount = result?.count ?? 0

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
            </div>
            <AdminNav
              userEmail={session.user.email ?? ""}
              pendingEventsCount={pendingEventsCount}
              signOutAction={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
