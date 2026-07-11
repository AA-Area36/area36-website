"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MultiSelectOption {
  label: string
  value: string
  color?: string
}

interface MultiSelectProps extends Pick<
  React.AriaAttributes,
  "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid"
> {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  id?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerId = React.useId()
  const listboxId = React.useId()
  const resolvedTriggerId = id ?? triggerId
  const [activeIndex, setActiveIndex] = React.useState(0)
  const selectAllRef = React.useRef<HTMLDivElement | null>(null)
  const optionRefs = React.useRef<Array<HTMLDivElement | null>>([])

  const itemCount = options.length + 1

  const focusIndex = React.useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(itemCount - 1, index))
    const node =
      clamped === 0 ? selectAllRef.current : optionRefs.current[clamped - 1]
    node?.focus()
  }, [itemCount])

  React.useEffect(() => {
    if (!open) return

    const firstSelected = options.findIndex((o) => value.includes(o.value))
    const initialIndex = firstSelected >= 0 ? firstSelected + 1 : 0
    setActiveIndex(initialIndex)

    // Wait for popover content to mount before focusing.
    requestAnimationFrame(() => focusIndex(initialIndex))
  }, [open, options, value, focusIndex])

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onChange([])
    } else {
      onChange(options.map((o) => o.value))
    }
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = (prev + 1) % itemCount
        focusIndex(next)
        return next
      })
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = (prev - 1 + itemCount) % itemCount
        focusIndex(next)
        return next
      })
      return
    }

    if (e.key === "Home") {
      e.preventDefault()
      setActiveIndex(() => {
        focusIndex(0)
        return 0
      })
      return
    }

    if (e.key === "End") {
      e.preventDefault()
      setActiveIndex(() => {
        const next = itemCount - 1
        focusIndex(next)
        return next
      })
      return
    }

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      if (activeIndex === 0) {
        handleSelectAll()
      } else {
        const option = options[activeIndex - 1]
        if (option) handleToggle(option.value)
      }
    }
  }

  const getDisplayText = () => {
    if (value.length === 0) return placeholder
    if (value.length === 1) {
      return options.find((o) => o.value === value[0])?.label || value[0]
    }
    return `${value.length} selected`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={resolvedTriggerId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-9 justify-between font-normal",
            !value.length && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        align="start"
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby={ariaLabelledBy ?? resolvedTriggerId}
        onKeyDown={handleListKeyDown}
      >
        <div className="max-h-[300px] overflow-auto">
          {/* Select All option */}
          <div
            ref={selectAllRef}
            role="option"
            aria-selected={value.length === options.length}
            onClick={handleSelectAll}
            onFocus={() => setActiveIndex(0)}
            tabIndex={activeIndex === 0 ? 0 : -1}
            className="flex w-full cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4 shrink-0 place-content-center rounded-[4px] border shadow-xs",
                value.length === options.length
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              )}
            >
              {value.length === options.length ? <Check className="size-3.5" /> : null}
            </span>
            <span className="text-sm font-medium">
              {value.length === options.length ? "Deselect all" : "Select all"}
            </span>
          </div>

          {/* Options */}
          {options.map((option, index) => {
            const isSelected = value.includes(option.value)
            const indexInList = index + 1
            return (
              <div
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleToggle(option.value)}
                onFocus={() => setActiveIndex(indexInList)}
                tabIndex={activeIndex === indexInList ? 0 : -1}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-4 shrink-0 place-content-center rounded-[4px] border shadow-xs",
                    isSelected
                      ? "border-primary-foreground bg-primary-foreground text-primary dark:border-white dark:bg-white"
                      : "border-input bg-background"
                  )}
                >
                  {isSelected ? <Check className="size-3.5" /> : null}
                </span>
                <span className="flex-1 text-sm">{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
