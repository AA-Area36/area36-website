"use client"

import { Button } from "@/components/ui/button"

export default function DistrictError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section
      className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 lg:p-8"
      role="alert"
      aria-live="assertive"
    >
      <h1 className="text-2xl font-semibold text-foreground">
        District information is temporarily unavailable
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        We couldn&apos;t load this district page. This does not mean the district has no
        events, contacts, positions, or updates. Please try again.
      </p>
      <Button className="mt-5" type="button" onClick={reset}>
        Try again
      </Button>
    </section>
  )
}
