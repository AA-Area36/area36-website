"use client"

import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GdriveLoaderProps {
  message?: string
}

/**
 * Loading state for GDrive content
 */
export function GdriveLoader({ message = "Loading files..." }: GdriveLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

interface GdriveErrorProps {
  resourceName?: string
  onRetry?: () => void | Promise<void>
}

/**
 * Error state for GDrive content
 */
export function GdriveError({ resourceName = "files", onRetry }: GdriveErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="h-8 w-8 text-destructive mb-4" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-foreground mb-2">
        {resourceName} are temporarily unavailable
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        We could not load this content. Please try again in a moment.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={() => void onRetry()}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  )
}

interface GdriveSkeletonProps {
  count?: number
  variant?: "card" | "list" | "grid"
}

/**
 * Skeleton loader for GDrive content
 */
export function GdriveSkeleton({ count = 5, variant = "list" }: GdriveSkeletonProps) {
  if (variant === "card") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (variant === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  // Default list variant
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
