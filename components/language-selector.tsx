"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "hmn", name: "Hmong", nativeName: "Hmoob" },
  { code: "so", name: "Somali", nativeName: "Soomaali" },
]

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}=(.*?)($|;)`))
  return m ? decodeURIComponent(m[1]!) : null
}

export function LanguageSelector() {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [currentLanguage, setCurrentLanguage] = React.useState("en")

  React.useEffect(() => {
    const fromCookie = readCookie("a36_locale")
    const fromHtml = document?.documentElement?.lang
    setCurrentLanguage(fromCookie || fromHtml || "en")
  }, [])

  function setLocale(code: string) {
    setCurrentLanguage(code)
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: code }),
      }).catch(() => {})
      // Re-render server components that read the locale cookie.
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select language" className="relative" disabled={pending}>
          <Globe className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Current language: {languages.find((l) => l.code === currentLanguage)?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            Translations are in progress. Some content may remain in English.
          </p>
        </div>
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLocale(language.code)}
            className={currentLanguage === language.code ? "bg-primary/10" : ""}
          >
            <span className="font-medium">{language.nativeName}</span>
            <span className="ml-2 text-muted-foreground text-sm">({language.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
