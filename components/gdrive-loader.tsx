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
  error: string
  onRetry?: () => void
}

/**
 * Error state for GDrive content
 */
export function GdriveError({ error, onRetry }: GdriveErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-4" />
      <p className="text-sm text-muted-foreground mb-4">
        Failed to load files: {error}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
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
