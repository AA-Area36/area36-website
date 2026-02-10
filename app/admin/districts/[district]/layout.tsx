import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Shield } from "lucide-react"
import { signOut } from "@/lib/auth"
import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user) {
    const callbackUrl = `https://d${districtNumber}.area36.org/admin`
    redirect(`https://area36.org/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const site = await getDistrictSiteConfig(districtNumber)
  const title = site?.displayName?.trim() || `District ${districtNumber}`

  const nav = [
    { href: `/admin`, label: "Dashboard" },
    { href: `/admin/calendar`, label: "Calendar" },
    { href: `/admin/contacts`, label: "Contacts" },
    { href: `/admin/positions`, label: "Positions" },
    { href: `/admin/updates`, label: "Updates" },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              <span>{title} Admin</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[320px]">
                {session.user.email}
              </span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav className="flex gap-4 pb-3 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
