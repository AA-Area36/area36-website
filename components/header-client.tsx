"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  ChevronDown,
  Info,
  Users,
  Map,
  FileText,
  Newspaper,
  Mic,
  BookOpen,
  Heart,
  Hand,
  Briefcase,
  BookMarked,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { AccessibilityMenu } from "@/components/accessibility-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/logo"

const OPEN_IN_NEW_TAB_TEXT = " (opens in new tab)"

export type HeaderNavItem = {
  name: string
  href: string
  children?: {
    name: string
    href: string
    icon?: React.ComponentType<{ className?: string }>
    description?: string
    group?: string
  }[]
}

// Client-side metadata for nav items (icons are React components, can't be passed from server)
const navItemMeta: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    description: string
    group?: string
  }
> = {
  "/about": { icon: Info, description: "Our mission & structure" },
  "/committees": { icon: Users, description: "Officers & committees" },
  "/districts": { icon: Map, description: "27 geographic districts" },
  "/resources": { icon: FileText, description: "Forms & documents" },
  "/newsletter": { icon: Newspaper, description: "The Pigeon newsletter" },
  "/recordings": { icon: Mic, description: "Audio recordings" },
  "/general-service-conference": {
    icon: BookOpen,
    description: "GSC materials",
    group: "Programs",
  },
  "/service-basics": {
    icon: Heart,
    description: "Getting involved",
    group: "Programs",
  },
  "/temporary-contact-programs": {
    icon: Hand,
    description: "Bridging the Gap",
    group: "Programs",
  },
  "/professionals": {
    icon: Briefcase,
    description: "Resources for professionals",
    group: "Programs",
  },
  "/grapevine": {
    icon: BookMarked,
    description: "A.A.'s meeting in print",
    group: "Programs",
  },
}

export function HeaderClient({
  brandTitle,
  brandSubtitle,
  navigation,
}: {
  brandTitle: string
  brandSubtitle: string
  navigation: HeaderNavItem[]
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({})
  const hamburgerRef = React.useRef<HTMLButtonElement>(null)
  const mobileMenuRef = React.useRef<HTMLDivElement>(null)
  const wasMobileMenuOpenRef = React.useRef(false)

  // Prevent hydration mismatch with Radix UI auto-generated IDs
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu on route change (handles back/forward navigation)
  React.useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Focus management: focus first link when menu opens, return focus when it closes
  React.useEffect(() => {
    const wasMobileMenuOpen = wasMobileMenuOpenRef.current
    wasMobileMenuOpenRef.current = mobileMenuOpen

    if (mobileMenuOpen) {
      const timer = setTimeout(() => {
        const firstLink = mobileMenuRef.current?.querySelector<HTMLElement>(
          "a, button[data-mobile-group]",
        )
        firstLink?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }

    if (wasMobileMenuOpen) {
      // Return focus only after the user closes an open menu. Focusing during
      // initial hydration would pull keyboard and screen-reader users to the
      // end of the header before they begin navigating the page.
      hamburgerRef.current?.focus()
    }
  }, [mobileMenuOpen])

  // Close mobile menu on Escape key
  React.useEffect(() => {
    if (!mobileMenuOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  function toggleGroup(name: string) {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  function isChildActive(
    children: NonNullable<HeaderNavItem["children"]>,
  ): boolean {
    return children.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
    )
  }

  /** Render desktop dropdown items with icons, descriptions, and group separators */
  function renderDropdownItems(
    children: NonNullable<HeaderNavItem["children"]>,
  ) {
    const contentItems = children.filter(
      (c) => !navItemMeta[c.href]?.group,
    )
    const programItems = children.filter(
      (c) => navItemMeta[c.href]?.group === "Programs",
    )

    return (
      <>
        {contentItems.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              Content
            </DropdownMenuLabel>
            {contentItems.map((child) => {
              const meta = navItemMeta[child.href]
              const Icon = meta?.icon
              return (
                <DropdownMenuItem key={child.href} asChild>
                  <Link
                    href={child.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-sm px-2 py-2 transition-colors",
                      pathname === child.href && "bg-primary/10 text-primary",
                    )}
                  >
                    {Icon && (
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70 transition-colors group-data-[highlighted]:text-accent-foreground group-data-[highlighted]:opacity-100" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{child.name}</span>
                      {meta?.description && (
                        <span className="text-xs text-foreground/70 transition-colors group-data-[highlighted]:text-accent-foreground/90">
                          {meta.description}
                        </span>
                      )}
                    </div>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </>
        )}
        {programItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              Programs
            </DropdownMenuLabel>
            {programItems.map((child) => {
              const meta = navItemMeta[child.href]
              const Icon = meta?.icon
              return (
                <DropdownMenuItem key={child.href} asChild>
                  <Link
                    href={child.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-sm px-2 py-2 transition-colors",
                      pathname === child.href && "bg-primary/10 text-primary",
                    )}
                  >
                    {Icon && (
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70 transition-colors group-data-[highlighted]:text-accent-foreground group-data-[highlighted]:opacity-100" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{child.name}</span>
                      {meta?.description && (
                        <span className="text-xs text-foreground/70 transition-colors group-data-[highlighted]:text-accent-foreground/90">
                          {meta.description}
                        </span>
                      )}
                    </div>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </>
        )}
      </>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label={`${brandTitle} Home`}
          >
            <Logo size="md" />
            <div className="hidden sm:block">
              <p className="text-lg font-semibold text-foreground">
                {brandTitle}
              </p>
              <p className="text-xs text-muted-foreground">{brandSubtitle}</p>
            </div>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {navigation.map((item) =>
            item.children ? (
              mounted ? (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        pathname.startsWith(item.href) ||
                          isChildActive(item.children)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                      aria-current={isChildActive(item.children) ? "page" : undefined}
                    >
                      {item.name}
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {renderDropdownItems(item.children)}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Render a placeholder during SSR to prevent hydration mismatch
                <button
                  type="button"
                  key={item.name}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname.startsWith(item.href) ||
                      isChildActive(item.children)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {item.name}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              )
            ) : item.href.startsWith("http") ? (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {item.name}
                <span className="sr-only">{OPEN_IN_NEW_TAB_TEXT}</span>
              </a>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.name}
              </Link>
            ),
          )}
          <div className="ml-4 flex items-center gap-1 border-l border-border pl-4">
            {mounted ? (
              <>
                <LanguageSelector />
                <AccessibilityMenu />
              </>
            ) : (
              // Placeholder for accessibility/language selectors during SSR
              <div className="w-20" />
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSelector />
          <AccessibilityMenu />
          <ThemeToggle />
          <Button
            ref={hamburgerRef}
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile menu (collapsible) */}
      <nav
        id="mobile-menu"
        ref={mobileMenuRef}
        aria-label="Mobile navigation"
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="space-y-1 px-4 pb-4">
          {navigation.map((item, itemIndex) =>
            item.children ? (
              <div key={item.name}>
                {itemIndex > 0 && <div className="border-t border-border/50 my-2" />}
                <button
                  type="button"
                  data-mobile-group
                  onClick={() => toggleGroup(item.name)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-base font-semibold rounded-md transition-colors bg-muted/50",
                    isChildActive(item.children) ? "text-primary" : "text-foreground",
                  )}
                  aria-expanded={!!expandedGroups[item.name]}
                  aria-controls={`mobile-group-${itemIndex}`}
                >
                  {item.name}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expandedGroups[item.name] && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`mobile-group-${itemIndex}`}
                  aria-hidden={!expandedGroups[item.name]}
                  inert={!expandedGroups[item.name]}
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    expandedGroups[item.name] ? "max-h-[50vh] opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-4 py-2.5 pl-8 text-sm font-medium rounded-md transition-colors",
                        pathname === child.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                      aria-current={pathname === child.href ? "page" : undefined}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div key={item.name}>
                {itemIndex > 0 && navigation[itemIndex - 1]?.children && (
                  <div className="border-t border-border/50 my-2" />
                )}
                {item.href.startsWith("http") ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {item.name}
                    <span className="sr-only">{OPEN_IN_NEW_TAB_TEXT}</span>
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3 text-base font-medium rounded-md transition-colors",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ),
          )}
        </div>
      </nav>
    </header>
  )
}
