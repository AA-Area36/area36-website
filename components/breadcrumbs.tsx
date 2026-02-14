"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const routeLabels: Record<string, string> = {
  "/about": "About",
  "/events": "Events",
  "/committees": "Committees & Officers",
  "/districts": "Districts",
  "/resources": "Resources",
  "/newsletter": "Newsletter",
  "/recordings": "Recordings",
  "/service": "Service Basics",
  "/service-basics": "Service Basics",
  "/general-service-conference": "General Service Conference",
  "/grapevine": "Grapevine",
  "/ypaa": "YPAA",
  "/professionals": "For Professionals",
  "/contribute": "Contribute",
  "/contact": "Contact",
  "/temporary-contact-programs": "Temporary Contact Programs",
  "/corrections-temporary-contact-program": "Corrections TCP",
  "/treatment-temporary-contact-program": "Treatment TCP",
  "/reports": "Reports",
}

export function Breadcrumbs() {
  const pathname = usePathname()

  if (pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const label = routeLabels[href] ?? segment
    const isLast = index === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </li>
          {crumbs.map(({ href, label, isLast }) => (
            <li key={href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              {isLast ? (
                <span aria-current="page" className="text-foreground font-medium">
                  {label}
                </span>
              ) : (
                <Link href={href} className="hover:text-primary transition-colors">
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
