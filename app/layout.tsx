import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Southern Minnesota Area 36 | Alcoholics Anonymous",
  description:
    "A.A. General Service website for Southern Minnesota Area 36. Find meetings, events, resources, and service information for Alcoholics Anonymous in southern Minnesota.",
  keywords: ["Alcoholics Anonymous", "AA", "Southern Minnesota", "Area 36", "SMAA", "recovery", "meetings", "sobriety"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
