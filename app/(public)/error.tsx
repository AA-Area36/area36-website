"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for monitoring
    console.error("Page error:", error)
  }, [error])

  return (
    <section className="bg-gradient-to-b from-primary/5 to-background py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Something Went Wrong
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            We encountered an unexpected error. Please try again, or head back
            to the homepage.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
