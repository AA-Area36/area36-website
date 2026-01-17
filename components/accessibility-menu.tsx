"use client"

import * as React from "react"
import { Accessibility, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AccessibilityMenu() {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Accessibility options">
          <Accessibility className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Accessibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <p className="text-sm text-muted-foreground mb-2">Text Size: {fontSize}%</p>
          <div className="flex items-center gap-2">
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
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/resources#asl" className="cursor-pointer">
            ASL Resources
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
