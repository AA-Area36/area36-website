"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { AccessibilityMenu } from "@/components/accessibility-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/logo"

const navigation = [
  { name: "Home", href: "/" },
  { name: "Events", href: "/events" },
  {
    name: "About",
    href: "/about",
    children: [
      { name: "About Area 36", href: "/about" },
      { name: "Committees & Officers", href: "/committees" },
      { name: "Districts", href: "/districts" },
    ],
  },
  {
    name: "Resources",
    href: "/resources",
    children: [
      { name: "Documents & Forms", href: "/resources" },
      { name: "Newsletter", href: "/newsletter" },
      { name: "Recordings", href: "/recordings" },
      { name: "Service Basics", href: "/service" },
      { name: "Temporary Contact Program", href: "/temporary-contact" },
      { name: "For Professionals", href: "/professionals" },
      { name: "Grapevine & La Viña", href: "/grapevine" },
    ],
  },
  { name: "YPAA", href: "/ypaa" },
  { name: "Contribute", href: "/contribute" },
  { name: "Contact", href: "/contact" },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Southern Minnesota Area 36 Home">
            <Logo size="md" />
            <div className="hidden sm:block">
              <p className="text-lg font-semibold text-foreground">Area 36</p>
              <p className="text-xs text-muted-foreground">Southern Minnesota A.A.</p>
            </div>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {navigation.map((item) =>
            item.children ? (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      pathname.startsWith(item.href) || item.children.some((c) => pathname === c.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {item.name}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.name} asChild>
                      <Link href={child.href} className={cn(pathname === child.href && "bg-primary/10 text-primary")}>
                        {child.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
            <LanguageSelector />
            <AccessibilityMenu />
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSelector />
          <ThemeToggle />
          <Button
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden" id="mobile-menu" role="menu">
          <div className="space-y-1 px-4 pb-4">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.name} className="space-y-1">
                  <span className="block px-4 py-2 text-sm font-semibold text-foreground">{item.name}</span>
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-4 py-2 pl-8 text-sm font-medium rounded-md transition-colors",
                        pathname === child.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                      aria-current={pathname === child.href ? "page" : undefined}
                      role="menuitem"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 text-base font-medium rounded-md transition-colors",
                    pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  aria-current={pathname === item.href ? "page" : undefined}
                  role="menuitem"
                >
                  {item.name}
                </Link>
              ),
            )}
          </div>
        </div>
      )}
    </header>
  )
}
