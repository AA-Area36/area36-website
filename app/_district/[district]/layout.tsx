import Link from "next/link"
import { notFound } from "next/navigation"
import { getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await getDistrictSiteConfig(districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") {
    notFound()
  }

  const title = site.displayName?.trim() || `District ${districtNumber}`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="https://area36.org" className="text-xs text-muted-foreground hover:text-foreground">
                Area 36
              </Link>
              <div className="mt-1 flex items-baseline gap-3">
                <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                <span className="text-xs text-muted-foreground">d{districtNumber}.area36.org</span>
              </div>
            </div>
            <nav className="flex flex-wrap gap-4 text-sm">
              <Link href={`/`} className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link href={`/calendar`} className="text-muted-foreground hover:text-foreground">
                Calendar
              </Link>
              <Link href={`/contacts`} className="text-muted-foreground hover:text-foreground">
                Contacts
              </Link>
              <Link href={`/positions`} className="text-muted-foreground hover:text-foreground">
                Positions
              </Link>
              <Link href={`/updates`} className="text-muted-foreground hover:text-foreground">
                Updates
              </Link>
              <Link href={`/admin`} className="text-primary hover:underline">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} {title}. Part of Southern Minnesota Area 36 of Alcoholics Anonymous.
          </p>
        </div>
      </footer>
    </div>
  )
}
