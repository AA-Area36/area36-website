import Link from "next/link"
import { Triangle, Mail, MapPin, ExternalLink } from "lucide-react"

const quickLinks = [
  { name: "Find a Meeting", href: "https://www.aa.org/find-aa", external: true },
  { name: "AA.org", href: "https://www.aa.org", external: true },
  { name: "General Service Office", href: "https://www.aa.org/aa-gso", external: true },
  { name: "Grapevine", href: "https://www.aagrapevine.org", external: true },
]

const areaLinks = [
  { name: "Events Calendar", href: "/events" },
  { name: "Committees & Officers", href: "/committees" },
  { name: "Districts", href: "/districts" },
  { name: "Resources", href: "/resources" },
  { name: "Newsletter", href: "/newsletter" },
  { name: "Service Basics", href: "/service" },
  { name: "YPAA", href: "/ypaa" },
  { name: "Contribute", href: "/contribute" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Triangle className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Area 36</p>
                <p className="text-xs text-muted-foreground">Southern Minnesota A.A.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The primary purpose of this website is to facilitate communication within Area 36 and between Area 36 and
              A.A. members.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">A.A. Resources</h3>
            <ul className="space-y-3" role="list">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                    {link.external && <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Area Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Area 36</h3>
            <ul className="space-y-3" role="list">
              {areaLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3" role="list">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <address className="not-italic">
                  SMAA
                  <br />
                  P.O. Box 2812
                  <br />
                  Minneapolis, MN 55402
                </address>
              </li>
              <li>
                <Link
                  href="mailto:chairperson@area36.org"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  chairperson@area36.org
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Southern Minnesota Area 36 of Alcoholics Anonymous. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/resources#asl" className="hover:text-primary transition-colors">
                ASL Resources
              </Link>
              <span aria-hidden="true">|</span>
              <Link href="/about#accessibility" className="hover:text-primary transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
