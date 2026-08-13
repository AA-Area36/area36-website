import { HeaderClient, type HeaderNavItem } from "@/components/header-client"
import { getRequestLocale } from "@/lib/i18n/get-locale"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"

export async function Header() {
  const locale = await getRequestLocale()
  const globalContent = await getContent("global", locale)
  const { t } = createTranslator(globalContent)

  const navigation: HeaderNavItem[] = [
    { name: t("header.nav.home", "Home"), href: "/" },
    { name: t("header.nav.events", "Events"), href: "/events" },
    {
      name: t("header.nav.about.label", "About"),
      href: "/about",
      children: [
        { name: t("header.nav.about.aboutArea36", "About Area 36"), href: "/about" },
        { name: t("header.nav.about.committeesOfficers", "Committees & Officers"), href: "/committees" },
        { name: t("header.nav.about.districts", "Districts"), href: "/districts" },
      ],
    },
    {
      name: t("header.nav.resources.label", "Resources"),
      href: "/resources",
      children: [
        { name: t("header.nav.resources.documentsForms", "Documents & Forms"), href: "/resources" },
        { name: t("header.nav.resources.newsletter", "Newsletter"), href: "/newsletter" },
        { name: t("header.nav.resources.recordings", "Recordings"), href: "/recordings" },
        { name: t("header.nav.resources.generalServiceConference", "General Service Conference"), href: "/general-service-conference" },
        { name: t("header.nav.resources.serviceBasics", "Service Basics"), href: "/service-basics" },
        { name: t("header.nav.resources.temporaryContactProgram", "Temporary Contact Program"), href: "/temporary-contact-programs" },
        { name: t("header.nav.resources.forProfessionals", "For Professionals"), href: "/professionals" },
        { name: t("header.nav.resources.grapevine", "Grapevine & La Viña"), href: "/grapevine" },
      ],
    },
    { name: t("header.nav.resources.newsletter", "Newsletter"), href: "/newsletter" },
    { name: t("header.nav.contribute", "Contribute"), href: "/contribute" },
    { name: t("header.nav.contact", "Contact"), href: "/contact" },
  ]

  return (
    <HeaderClient
      brandTitle={t("header.brand.title", "Area 36")}
      brandSubtitle={t("header.brand.subtitle", "Southern Minnesota A.A.")}
      navigation={navigation}
    />
  )
}
