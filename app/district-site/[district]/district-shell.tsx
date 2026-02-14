"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, Menu, NotebookText, UsersRound, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { AccessibilityMenu } from "@/components/accessibility-menu"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

type DistrictShellProps = {
  districtNumber: number
  title: string
  previewMode?: boolean
  children: React.ReactNode
}

const navigation = [
  { href: "/", label: "Overview", icon: CalendarDays },
  { href: "/calendar", label: "Events", icon: CalendarDays },
  { href: "/contacts", label: "Chairs & Contacts", icon: UsersRound },
  { href: "/updates", label: "Agenda Notes", icon: NotebookText },
  { href: "/positions", label: "Service Positions", icon: BriefcaseBusiness },
]

const MEETING_FINDER_URL = "https://www.aa.org/find-aa"

function normalizePath(pathname: string, districtNumber: number): string {
  const hostedPrefix = `/district-site/${districtNumber}`
  if (pathname === hostedPrefix) return "/"
  if (pathname.startsWith(`${hostedPrefix}/`)) return pathname.slice(hostedPrefix.length)
  return pathname
}

export function DistrictShell({ districtNumber, title, previewMode = false, children }: DistrictShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const normalizedPath = normalizePath(pathname, districtNumber)
  const hostedPrefix = pathname.startsWith(`/district-site/${districtNumber}`) ? `/district-site/${districtNumber}` : ""
  const districtHref = (href: string) => `${hostedPrefix}${href === "/" ? "" : href}` || "/"
  const adminHref = hostedPrefix ? `/admin/districts/${districtNumber}` : "/admin"

  return (
    <div className="min-h-screen bg-muted/20 [font-family:var(--font-district-body)]">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <Link href={districtHref("/")} className="flex min-w-0 items-center gap-3">
              <Logo size="md" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">District {districtNumber}</p>
                <p className="truncate text-2xl font-semibold leading-tight [font-family:var(--font-district-display)]">{title}</p>
              </div>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              <AccessibilityMenu aslHref="https://area36.org/resources#asl" />
              <ThemeToggle />
            </div>

            <div className="flex items-center gap-1 md:hidden">
              <AccessibilityMenu aslHref="https://area36.org/resources#asl" />
              <ThemeToggle />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-expanded={mobileOpen}
                aria-controls="district-mobile-nav"
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="mt-4 hidden items-center justify-between gap-4 md:flex">
            <nav className="flex flex-wrap items-center gap-2" aria-label="District navigation">
              {navigation.map((item) => {
                const active = normalizedPath === item.href || (item.href !== "/" && normalizedPath.startsWith(`${item.href}/`))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={districtHref(item.href)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-3">
              {previewMode && (
                <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                  Local Preview
                </span>
              )}
              <a href="https://area36.org" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Area resources
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <nav
            id="district-mobile-nav"
            className={cn(
              "overflow-hidden transition-all duration-300 md:hidden",
              mobileOpen ? "mt-4 max-h-[420px] opacity-100" : "max-h-0 opacity-0",
            )}
            aria-label="District mobile navigation"
          >
            <div className="space-y-1 rounded-xl border border-border bg-card p-2">
              {navigation.map((item) => {
                const active = normalizedPath === item.href || (item.href !== "/" && normalizedPath.startsWith(`${item.href}/`))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={districtHref(item.href)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
              <div className="flex items-center justify-between px-2 pt-2">
                {previewMode && (
                  <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                    Preview
                  </span>
                )}
                <a href="https://area36.org" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Area resources
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <Logo size="sm" />
                <div>
                  <p className="font-semibold [font-family:var(--font-district-display)]">{title}</p>
                  <p className="text-xs text-muted-foreground">District service website</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                For help with alcohol, visit the{" "}
                <a href={MEETING_FINDER_URL} className="text-primary hover:underline">
                  AA Meeting Finder
                </a>{" "}
                or call the AA Hotline.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">District</h4>
              <ul className="mt-3 space-y-2">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link href={districtHref(item.href)} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="https://area36.org" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Area 36 Minnesota
                  </a>
                </li>
                <li>
                  <a href="https://www.aa.org" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    AA World Services
                  </a>
                </li>
                <li>
                  <a href={MEETING_FINDER_URL} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Find a Meeting
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {title}. Part of Area 36 Minnesota.</p>
            <Link href={adminHref} className="transition-colors hover:text-foreground">
              Admin Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
