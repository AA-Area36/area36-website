"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface CategoryGroup {
  label: string
  options: string[]
}

// Predefined category suggestions grouped by page/feature
const CATEGORY_GROUPS: CategoryGroup[] = [
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

interface CategoryComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Select or type a category...",
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // All preset values flattened for matching
  const allPresets = React.useMemo(
    () => CATEGORY_GROUPS.flatMap((g) => g.options),
    []
  )

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setSearch("")
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setSearch("")
  }

  // Check if typed search is a custom value (not in presets)
  const isCustomValue = search.trim() !== "" && !allPresets.some(
    (p) => p.toLowerCase() === search.trim().toLowerCase()
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search or type custom..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-3 px-2 text-sm text-muted-foreground">
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-default"
                  onClick={() => handleSelect(search.trim())}
                >
                  Use &ldquo;{search.trim()}&rdquo;
                </button>
              ) : (
                "Type to search or enter a custom category."
              )}
            </CommandEmpty>

            {/* Custom value option when typing something not in presets */}
            {isCustomValue && (
              <>
                <CommandGroup heading="Custom">
                  <CommandItem
                    value={`custom:${search.trim()}`}
                    onSelect={() => handleSelect(search.trim())}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === search.trim() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Use &ldquo;{search.trim()}&rdquo;
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Grouped preset options */}
            {CATEGORY_GROUPS.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
