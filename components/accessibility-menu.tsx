"use client"

import * as React from "react"
import { Accessibility, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function AccessibilityMenu({ aslHref = "/resources#asl" }: { aslHref?: string }) {
  const [fontSize, setFontSize] = React.useState(100)

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 10, 150)
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}%`
  }

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 10, 80)
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}%`
  }

  const resetFontSize = () => {
    setFontSize(100)
    document.documentElement.style.fontSize = "100%"
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Accessibility options">
          <Accessibility className="h-5 w-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64"
        aria-labelledby="accessibility-options-heading"
      >
        <h2 id="accessibility-options-heading" className="font-medium">
          Accessibility
        </h2>
        <div className="mt-3 border-y py-3">
          <p id="text-size-value" className="mb-2 text-sm text-muted-foreground">
            Text Size: {fontSize}%
          </p>
          <div className="flex items-center gap-2" aria-describedby="text-size-value">
            <Button
              variant="outline"
              size="sm"
              onClick={decreaseFontSize}
              disabled={fontSize <= 80}
              aria-label="Decrease text size"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetFontSize} aria-label="Reset text size">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={increaseFontSize}
              disabled={fontSize >= 150}
              aria-label="Increase text size"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <a
          href={aslHref}
          className="mt-3 inline-flex rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          ASL Resources
        </a>
      </PopoverContent>
    </Popover>
  )
}
