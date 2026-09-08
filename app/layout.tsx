import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { getRequestLocale, localeToHtmlLang } from "@/lib/i18n/get-locale"
import { SkipLink } from "@/components/skip-link"
import "./globals.css"

export const metadata: Metadata = {
  title: "Southern Minnesota Area 36 | Alcoholics Anonymous",
  description:
    "A.A. General Service website for Southern Minnesota Area 36. Find meetings, events, resources, and service information for Alcoholics Anonymous in southern Minnesota.",
  keywords: ["Alcoholics Anonymous", "AA", "Southern Minnesota", "Area 36", "SMAA", "recovery", "meetings", "sobriety"],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getRequestLocale()
  return (
    <html lang={localeToHtmlLang(locale)} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SkipLink />
          {children}
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
