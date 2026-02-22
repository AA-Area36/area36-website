"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Mic,
  Files,
  TrendingUp,
  FileText,
  Languages,
  Map,
  Building2,
  ShieldCheck,
  MoreHorizontal,
  Menu,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface AdminNavProps {
  userEmail: string
  pendingEventsCount: number
  signOutAction: () => void
}

const primaryLinks = [
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/recordings", label: "Recordings", icon: Mic },
  { href: "/admin/files", label: "Files", icon: Files },
  { href: "/admin/content", label: "Content", icon: Languages },
] as const

const secondaryLinks = [
  { href: "/admin/subscription-drives", label: "Subscription Drives", icon: TrendingUp },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/district-sites", label: "District Sites", icon: Map },
  { href: "/admin/corrections", label: "Corrections", icon: Building2 },
  { href: "/admin/roles", label: "Role Management", icon: ShieldCheck },
] as const

const allLinks = [...primaryLinks, ...secondaryLinks]

export function AdminNav({ userEmail, pendingEventsCount, signOutAction }: AdminNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  function linkClasses(href: string) {
    return isActive(href)
      ? "bg-primary/10 text-primary font-medium rounded-md"
      : "text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden sm:flex items-center gap-4">
        <nav className="flex items-center gap-1">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("flex items-center gap-2 text-sm px-3 py-1.5", linkClasses(link.href))}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {link.label === "Events" && pendingEventsCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {pendingEventsCount}
                </Badge>
              )}
            </Link>
          ))}

          {/* Separator */}
          <div className="mx-1 h-6 w-px bg-border" />

          {/* More dropdown for secondary links */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {secondaryLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href} className="flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="text-sm text-muted-foreground">
          {userEmail}
        </div>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {allLinks.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 w-full",
                    isActive(link.href) && "font-medium text-primary"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.label === "Events" && pendingEventsCount > 0 && (
                    <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5 text-[10px]">
                      {pendingEventsCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
              {userEmail}
            </div>
            <DropdownMenuItem asChild>
              <form action={signOutAction} className="w-full">
                <button type="submit" className="flex items-center gap-2 w-full text-sm cursor-default">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
