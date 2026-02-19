import Link from "next/link"
import { redirect } from "next/navigation"
import { Shield } from "lucide-react"
import { getSession, signOut } from "@/lib/auth"
import { hasPermission } from "@/lib/auth/rbac"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { AdminNav } from "@/components/admin-nav"

export const dynamic = "force-dynamic"

export default async function CorrectionsAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user?.email) {
    redirect("/admin/login?callbackUrl=/admin/corrections")
  }

  const canView = session.user.isAreaAdmin || (await hasPermission(session, "corrections:view"))
  if (!canView) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in but does not have access to Corrections management.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/" className="text-sm text-primary hover:underline">
              Return to site
            </Link>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button className="text-sm text-muted-foreground hover:text-foreground" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              <span>Area 36 Admin</span>
            </Link>
            <HeaderNav userEmail={session.user.email ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}

async function HeaderNav({ userEmail }: { userEmail: string }) {
  let pendingEventsCount = 0

  try {
    const db = await getDb()
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.status, "pending"))
    pendingEventsCount = result?.count ?? 0
  } catch {
    pendingEventsCount = 0
  }

  return (
    <AdminNav
      userEmail={userEmail}
      pendingEventsCount={pendingEventsCount}
      signOutAction={async () => {
        "use server"
        await signOut({ redirectTo: "/" })
      }}
    />
  )
}
