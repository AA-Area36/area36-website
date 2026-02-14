import Link from "next/link"
import { Mail, MapPin, ExternalLink } from "lucide-react"
import { Logo } from "@/components/logo"
import { getRequestLocale } from "@/lib/i18n/get-locale"
import { getContent } from "@/lib/content/repo"
import { createTranslator, formatTemplate, getAtPath } from "@/lib/content/t"

export async function Footer() {
  const locale = await getRequestLocale()
  const globalContent = await getContent("global", locale)
  const { t } = createTranslator(globalContent)
  const serviceAreaHrefRaw = t("footer.areaLinks.service.href", "/service-basics")
  const serviceAreaHref = serviceAreaHrefRaw === "/service" ? "/service-basics" : serviceAreaHrefRaw

  const quickLinks = [
    { name: t("footer.quickLinks.findMeeting.label", "Find a Meeting"), href: t("footer.quickLinks.findMeeting.href", "https://www.aa.org/find-aa"), external: true },
    { name: t("footer.quickLinks.aaOrg.label", "AA.org"), href: t("footer.quickLinks.aaOrg.href", "https://www.aa.org"), external: true },
    { name: t("footer.quickLinks.gso.label", "General Service Office"), href: t("footer.quickLinks.gso.href", "https://www.aa.org/aa-gso"), external: true },
    { name: t("footer.quickLinks.grapevine.label", "Grapevine"), href: t("footer.quickLinks.grapevine.href", "https://www.aagrapevine.org"), external: true },
  ]

  const areaLinks = [
    { name: t("footer.areaLinks.events.label", "Events Calendar"), href: t("footer.areaLinks.events.href", "/events") },
    { name: t("footer.areaLinks.committees.label", "Committees & Officers"), href: t("footer.areaLinks.committees.href", "/committees") },
    { name: t("footer.areaLinks.districts.label", "Districts"), href: t("footer.areaLinks.districts.href", "/districts") },
    { name: t("footer.areaLinks.resources.label", "Resources"), href: t("footer.areaLinks.resources.href", "/resources") },
    { name: t("footer.areaLinks.newsletter.label", "Newsletter"), href: t("footer.areaLinks.newsletter.href", "/newsletter") },
    { name: t("footer.areaLinks.service.label", "Service Basics"), href: serviceAreaHref },
    { name: t("footer.areaLinks.ypaa.label", "YPAA"), href: t("footer.areaLinks.ypaa.href", "/ypaa") },
    { name: t("footer.areaLinks.professionals.label", "For Professionals"), href: t("footer.areaLinks.professionals.href", "/professionals") },
    { name: t("footer.areaLinks.gsc.label", "General Service Conference"), href: t("footer.areaLinks.gsc.href", "/general-service-conference") },
    { name: t("footer.areaLinks.contribute.label", "Contribute"), href: t("footer.areaLinks.contribute.href", "/contribute") },
  ]

  const addressLinesRaw = getAtPath(globalContent, "footer.contact.addressLines")
  const addressLines =
    Array.isArray(addressLinesRaw) && addressLinesRaw.every((x) => typeof x === "string")
      ? (addressLinesRaw as string[])
      : ["SMAA", "P.O. Box 2812", "Minneapolis, MN 55402"]

  const copyright = formatTemplate(
    t("footer.bottom.copyright", "© {year} Southern Minnesota Area 36 of Alcoholics Anonymous. All rights reserved."),
    { year: new Date().getFullYear() },
  )

  return (
    <footer className="border-t border-border bg-card" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <p className="font-semibold text-foreground">{t("footer.brand.title", "Area 36")}</p>
                <p className="text-xs text-muted-foreground">{t("footer.brand.subtitle", "Southern Minnesota A.A.")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "footer.blurb",
                "The primary purpose of this website is to facilitate communication within Area 36 and between Area 36 and A.A. members.",
              )}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("footer.titles.aaResources", "A.A. Resources")}</h3>
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
                    {link.external && (
                      <ExternalLink className="h-3 w-3" aria-label={t("footer.bottom.opensNewTab", "(opens in new tab)")} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Area Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("footer.titles.area", "Area 36")}</h3>
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
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("footer.titles.contact", "Contact")}</h3>
            <ul className="space-y-3" role="list">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <address className="not-italic">
                  {addressLines.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </address>
              </li>
              <li>
                <Link
                  href={t("footer.contact.emailHref", "mailto:chairperson@area36.org")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {t("footer.contact.emailLabel", "chairperson@area36.org")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {copyright}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/resources#asl" className="hover:text-primary transition-colors">
                {t("footer.bottom.aslResources", "ASL Resources")}
              </Link>
              <span aria-hidden="true">|</span>
              <Link href="/about#accessibility" className="hover:text-primary transition-colors">
                {t("footer.bottom.accessibility", "Accessibility")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
