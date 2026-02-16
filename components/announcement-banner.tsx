"use client"

import * as React from "react"
import { X } from "lucide-react"

const STORAGE_KEY = "a36_banner_dismissed"

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = React.useState(true) // Start hidden to prevent flash

  React.useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true"
    setDismissed(isDismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <p className="text-sm">
          Want to use the old experience?{" "}
          <a
            href="https://old.area36.org"
            className="underline font-medium hover:opacity-80"
            target="_blank"
            rel="noopener noreferrer"
          >
            Click here
          </a>
          {" "}<span className="opacity-80">(Note: The old site will be going away before the end of the year)</span>
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="p-1 hover:opacity-80 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
