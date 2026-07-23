"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition, type ComponentType } from "react"
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AppPermission } from "@/lib/auth/permissions"
import {
  LOCAL_VIEW_AS_COOKIE,
  LOCAL_VIEW_AS_DEFAULT,
  LOCAL_VIEW_AS_OPTIONS,
  normalizeLocalViewAsKey,
  type LocalViewAsKey,
} from "@/lib/auth/local-view-as-shared"
import { cn } from "@/lib/utils"

interface AdminNavProps {
  userEmail: string
  pendingEventsCount: number
  permissions: string[]
  showLocalViewAs?: boolean
  initialLocalViewAs?: string | null
  signOutAction: () => void
}

type NavLink = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  requiredPermission: AppPermission
}

const primaryLinks = [
  { href: "/admin/events", label: "Events", icon: CalendarDays, requiredPermission: "events:read" },
  { href: "/admin/recordings", label: "Recordings", icon: Mic, requiredPermission: "recordings:read" },
  { href: "/admin/files", label: "Files", icon: Files, requiredPermission: "files:read" },
  { href: "/admin/content", label: "Content", icon: Languages, requiredPermission: "content:read" },
] as const satisfies readonly NavLink[]

const secondaryLinks = [
  {
    href: "/admin/subscription-drives",
    label: "Subscription Drives",
    icon: TrendingUp,
    requiredPermission: "subscription-drives:read",
  },
  { href: "/admin/reports", label: "Reports", icon: FileText, requiredPermission: "reports:read" },
  { href: "/admin/district-sites", label: "District Sites", icon: Map, requiredPermission: "district-sites:read" },
  { href: "/admin/corrections", label: "Corrections", icon: Building2, requiredPermission: "corrections:view" },
  { href: "/admin/roles", label: "Role Management", icon: ShieldCheck, requiredPermission: "access:read" },
] as const satisfies readonly NavLink[]

const VIEW_AS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function AdminNav({
  userEmail,
  pendingEventsCount,
  permissions,
  showLocalViewAs = false,
  initialLocalViewAs = LOCAL_VIEW_AS_DEFAULT,
  signOutAction,
}: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isViewAsPending, startViewAsTransition] = useTransition()
  const [viewAsKey, setViewAsKey] = useState<LocalViewAsKey>(() => normalizeLocalViewAsKey(initialLocalViewAs))
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  const visiblePrimaryLinks = useMemo(
    () => primaryLinks.filter((link) => permissionSet.has(link.requiredPermission)),
    [permissionSet]
  )
  const visibleSecondaryLinks = useMemo(
    () => secondaryLinks.filter((link) => permissionSet.has(link.requiredPermission)),
    [permissionSet]
  )
  const visibleLinks = useMemo(
    () => [...visiblePrimaryLinks, ...visibleSecondaryLinks],
    [visiblePrimaryLinks, visibleSecondaryLinks]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Refresh the local preview role when the server-provided role changes.
    setViewAsKey(normalizeLocalViewAsKey(initialLocalViewAs))
  }, [initialLocalViewAs])

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  function linkClasses(href: string) {
    return isActive(href)
      ? "bg-primary/10 text-primary font-medium rounded-md"
      : "text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
  }

  function setLocalViewAs(nextValue: string) {
    const nextKey = normalizeLocalViewAsKey(nextValue)
    setViewAsKey(nextKey)
    document.cookie = `${LOCAL_VIEW_AS_COOKIE}=${encodeURIComponent(nextKey)}; path=/; max-age=${VIEW_AS_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
    startViewAsTransition(() => {
      router.refresh()
    })
  }

  const activeViewAsOption = LOCAL_VIEW_AS_OPTIONS.find((option) => option.key === viewAsKey) ?? LOCAL_VIEW_AS_OPTIONS[0]

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden sm:flex items-center gap-4">
        <nav className="flex items-center gap-1">
          {visiblePrimaryLinks.map((link) => (
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

          {visibleSecondaryLinks.length > 0 && (
            <>
              <div className="mx-1 h-6 w-px bg-border" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {visibleSecondaryLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="flex items-center gap-2">
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>

        {showLocalViewAs && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                View as: {activeViewAsOption.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Localhost role preview</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={viewAsKey} onValueChange={setLocalViewAs}>
                {LOCAL_VIEW_AS_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.key} value={option.key} disabled={isViewAsPending}>
                    <div className="flex flex-col gap-0.5">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
            {visibleLinks.map((link) => (
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
            {showLocalViewAs && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>View as</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={viewAsKey} onValueChange={setLocalViewAs}>
                  {LOCAL_VIEW_AS_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.key} value={option.key} disabled={isViewAsPending}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
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
