"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DOCUMENT_CATEGORIES } from "@/lib/resources/organization"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CategoryGroup {
  label: string
  options: string[]
}

// Predefined category suggestions grouped by page/feature
const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Documents & Forms",
    options: DOCUMENT_CATEGORIES.map(({ label }) => label),
  },
  {
    label: "Events",
    options: ["Annual Calendar"],
  },
  {
    label: "General Service Conference",
    options: [
      "GSC Agenda Items",
      "GSC Background Materials",
      "GSC Advisory Actions",
    ],
  },
  {
    label: "Service Basics",
    options: [
      "General Materials",
      "General Service Representatives (GSRs)",
      "Group Servants",
      "District Committee Member",
      "Area & District Committee Chairs",
      "Area Trusted Servants",
      "Group Inventory",
    ],
  },
  {
    label: "Committees",
    options: [
      "Pink Can Plan",
      "History Form",
    ],
  },
]

const CATEGORY_PRESETS = CATEGORY_GROUPS.flatMap((group) => group.options)

interface CategoryComboboxProps {
  id?: string
  "aria-describedby"?: string
  value: string
  onChange: (value: string) => void
  popoverContainer: HTMLElement | null
  placeholder?: string
}

export function CategoryCombobox({
  id,
  "aria-describedby": descriptionId,
  value,
  onChange,
  popoverContainer,
  placeholder = "Select or type a category...",
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const trigger = React.useRef<HTMLButtonElement>(null)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setSearch("")
  }

  function handleSelect(selectedValue: string) {
    onChange(selectedValue)
    handleOpenChange(false)
  }

  const customValue = search.trim()
  const isCustomValue = customValue !== "" && !CATEGORY_PRESETS.some(
    (preset) => preset.toLowerCase() === customValue.toLowerCase()
  )

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={trigger}
            id={id}
            type="button"
            aria-describedby={descriptionId}
            variant="outline"
            role="combobox"
            className="min-w-0 flex-1 justify-between font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
            <ChevronsUpDown className="opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          container={popoverContainer}
          aria-label="Category options"
          className="w-(--radix-popover-trigger-width) max-w-(--radix-popover-content-available-width) p-0"
          align="start"
          collisionPadding={8}
        >
          <Command label="Search categories" className="max-h-(--radix-popover-content-available-height)">
            <CommandInput
              placeholder="Search or type custom..."
              value={search}
              onValueChange={setSearch}
              wrapperClassName="shrink-0"
            />
            <CommandList className="min-h-0 overscroll-contain">
              {isCustomValue && (
                <CommandGroup heading="Custom">
                  <CommandItem
                    value={customValue}
                    onSelect={() => handleSelect(customValue)}
                    className="break-all"
                  >
                    Use &ldquo;{customValue}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
              {CATEGORY_GROUPS.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.options.map((option) => (
                    <CommandItem key={option} value={option} onSelect={() => handleSelect(option)}>
                      <Check className={value === option ? "opacity-100" : "opacity-0"} aria-hidden="true" />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Clear category"
          title="Clear category"
          onClick={() => {
            handleSelect("")
            trigger.current?.focus()
          }}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
