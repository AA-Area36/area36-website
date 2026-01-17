"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "hmn", name: "Hmong", nativeName: "Hmoob" },
  { code: "so", name: "Somali", nativeName: "Soomaali" },
]

export function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = React.useState("en")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select language" className="relative">
          <Globe className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Current language: {languages.find((l) => l.code === currentLanguage)?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setCurrentLanguage(language.code)}
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
