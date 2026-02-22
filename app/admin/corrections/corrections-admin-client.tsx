"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  UserRoundSearch,
  UsersRound,
  X,
} from "lucide-react"
import type { CorrectionsContact, CorrectionsRecipient } from "@/lib/db/schema"
import { rankContactsForRecipient } from "@/lib/corrections/matching"
import {
  CORRECTIONS_FACILITY_OPTIONS,
  CORRECTIONS_GENDER_OPTIONS,
  CORRECTIONS_SOURCE_OPTIONS,
  RECIPIENT_STATUS_OPTIONS,
} from "@/lib/corrections/options"
import {
  createCorrectionsContact,
  createCorrectionsRecipient,
  deleteCorrectionsContact,
  deleteCorrectionsRecipient,
  markRecipientCompleted,
  markRecipientUnmatched,
  matchRecipientToContact,
  updateCorrectionsContact,
  updateCorrectionsRecipient,
} from "./actions"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormSubmitButton } from "@/components/form-submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type PageSearchParams = Record<string, string | string[] | undefined>

export type RecipientMatchSummary = {
  recipientId: string
  contactId: string
  contactName: string
  matchedAt: string
}

export type SummaryMetric = {
  key: string
  label: string
  current: number
  monthCurrent: number
  monthPrevious: number
  delta: number
}

type CorrectionsAdminClientProps = {
  contacts: CorrectionsContact[]
  recipients: CorrectionsRecipient[]
  activeMatches: RecipientMatchSummary[]
  contactsMetrics: SummaryMetric[]
  recipientMetrics: SummaryMetric[]
  canEdit: boolean
  canDelete: boolean
  initialSearchParams: PageSearchParams
}

type ContactFilterState = {
  q: string
  firstName: string
  lastName: string
  gender: string
  streetAddress: string
  city: string
  county: string
  state: string
  zipCode: string
  email: string
  sobrietyDate: string
  phonePrimary: string
  phoneSecondary: string
  birthYear: string
  spanish: string
  otherLanguages: string
  homeGroup: string
  notes: string
  active: string
  legacyInternalId: string
}

type RecipientFilterState = {
  q: string
  status: string
  firstName: string
  lastName: string
  idNumber: string
  gender: string
  birthYear: string
  dischargeDate: string
  phone: string
  facilityName: string
  source: string
  contactEmail: string
  releaseAddress: string
  releaseCity: string
  releaseCounty: string
  releaseState: string
  releaseZip: string
  notes: string
  legacyInternalId: string
}

type FilterChip = {
  id: string
  key: string
  label: string
  value: string
  multi: boolean
}

type FilterDescriptor<T extends Record<string, string>> = {
  key: keyof T
  label: string
  kind: "text" | "select" | "birthYear"
  options?: string[]
}

type ComboboxOption = {
  value: string
  label: string
}

const CONTACT_MULTI_KEYS: Array<keyof ContactFilterState> = [
  "active",
  "spanish",
  "gender",
  "city",
  "county",
  "state",
  "zipCode",
]

const RECIPIENT_MULTI_KEYS: Array<keyof RecipientFilterState> = [
  "status",
  "gender",
  "facilityName",
  "source",
  "releaseCity",
  "releaseCounty",
  "releaseState",
  "releaseZip",
]

const MULTI_VALUE_DELIMITER = ","

const EMPTY_CONTACT_FILTERS: ContactFilterState = {
  q: "",
  firstName: "",
  lastName: "",
  gender: "",
  streetAddress: "",
  city: "",
  county: "",
  state: "",
  zipCode: "",
  email: "",
  sobrietyDate: "",
  phonePrimary: "",
  phoneSecondary: "",
  birthYear: "",
  spanish: "",
  otherLanguages: "",
  homeGroup: "",
  notes: "",
  active: "",
  legacyInternalId: "",
}

const EMPTY_RECIPIENT_FILTERS: RecipientFilterState = {
  q: "",
  status: "",
  firstName: "",
  lastName: "",
  idNumber: "",
  gender: "",
  birthYear: "",
  dischargeDate: "",
  phone: "",
  facilityName: "",
  source: "",
  contactEmail: "",
  releaseAddress: "",
  releaseCity: "",
  releaseCounty: "",
  releaseState: "",
  releaseZip: "",
  notes: "",
  legacyInternalId: "",
}

function norm(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

function stringIncludes(value: string | null | undefined, filter: string): boolean {
  if (!filter) return true
  return norm(value).includes(norm(filter))
}

function getParam(searchParams: URLSearchParams, key: string, fallback?: string): string {
  const value = searchParams.get(key)
  return value ?? fallback ?? ""
}

function parseInitialParam(source: PageSearchParams, key: string): string {
  const value = source[key]
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0] ?? ""
  return ""
}

function dedupeSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
}

function splitMultiValues(value: string): string[] {
  return value
    .split(MULTI_VALUE_DELIMITER)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinMultiValues(values: string[]): string {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(MULTI_VALUE_DELIMITER)
}

function appendMultiValue(current: string, next: string): string {
  return joinMultiValues([...splitMultiValues(current), next])
}

function removeMultiValue(current: string, target: string): string {
  return joinMultiValues(splitMultiValues(current).filter((item) => norm(item) !== norm(target)))
}

function includesMultiValue(current: string, target: string): boolean {
  return splitMultiValues(current).some((item) => norm(item) === norm(target))
}

function matchesMultiSelectExact(value: string | null | undefined, filter: string): boolean {
  const selections = splitMultiValues(filter)
  if (selections.length === 0) return true
  const normalizedValue = norm(value)
  return selections.some((selection) => norm(selection) === normalizedValue)
}

function normalizeGender(value: string | null | undefined): "Male" | "Female" | null {
  const parsed = norm(value)
  if (!parsed) return null
  if (parsed === "male" || parsed === "m" || parsed === "man" || parsed === "men") return "Male"
  if (parsed === "female" || parsed === "f" || parsed === "woman" || parsed === "women") return "Female"
  return null
}

function normalizeBirthYearFilter(value: string): string {
  return value.replace(/\s+/g, "")
}

function parseBirthYearFilter(value: string): { min: number; max: number } | null {
  const parsed = normalizeBirthYearFilter(value)
  if (!parsed) return null

  const single = /^(\d{4})$/.exec(parsed)
  if (single) {
    const year = Number(single[1])
    return { min: year, max: year }
  }

  const range = /^(\d{4})-(\d{4})$/.exec(parsed)
  if (!range) return null

  const min = Number(range[1])
  const max = Number(range[2])

  if (min > max) {
    return { min: max, max: min }
  }

  return { min, max }
}

function matchesBirthYearFilter(value: number | null | undefined, filter: string): boolean {
  const parsedFilter = parseBirthYearFilter(filter)
  if (!parsedFilter) return !filter.trim()
  if (value == null) return false
  return value >= parsedFilter.min && value <= parsedFilter.max
}

function formatBirthYearFilterLabel(value: string): string {
  const parsed = parseBirthYearFilter(value)
  if (!parsed) return value
  if (parsed.min === parsed.max) return String(parsed.min)
  return `${parsed.min}-${parsed.max}`
}

function statusBadgeClass(status: string): string {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "pending") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function formatStatusLabel(status: string): string {
  if (!status) return ""
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

function formatDetailValue(value: string | number | null | undefined): string {
  if (value == null) return "-"
  const parsed = String(value).trim()
  return parsed || "-"
}

function parseContactFiltersFromParams(searchParams: URLSearchParams, initialSearchParams: PageSearchParams): ContactFilterState {
  return {
    q: getParam(searchParams, "c_q", parseInitialParam(initialSearchParams, "c_q")),
    firstName: getParam(searchParams, "c_firstName", parseInitialParam(initialSearchParams, "c_firstName")),
    lastName: getParam(searchParams, "c_lastName", parseInitialParam(initialSearchParams, "c_lastName")),
    gender: getParam(searchParams, "c_gender", parseInitialParam(initialSearchParams, "c_gender")),
    streetAddress: getParam(searchParams, "c_streetAddress", parseInitialParam(initialSearchParams, "c_streetAddress")),
    city: getParam(searchParams, "c_city", parseInitialParam(initialSearchParams, "c_city")),
    county: getParam(searchParams, "c_county", parseInitialParam(initialSearchParams, "c_county")),
    state: getParam(searchParams, "c_state", parseInitialParam(initialSearchParams, "c_state")),
    zipCode: getParam(searchParams, "c_zipCode", parseInitialParam(initialSearchParams, "c_zipCode")),
    email: getParam(searchParams, "c_email", parseInitialParam(initialSearchParams, "c_email")),
    sobrietyDate: getParam(searchParams, "c_sobrietyDate", parseInitialParam(initialSearchParams, "c_sobrietyDate")),
    phonePrimary: getParam(searchParams, "c_phonePrimary", parseInitialParam(initialSearchParams, "c_phonePrimary")),
    phoneSecondary: getParam(searchParams, "c_phoneSecondary", parseInitialParam(initialSearchParams, "c_phoneSecondary")),
    birthYear: getParam(searchParams, "c_birthYear", parseInitialParam(initialSearchParams, "c_birthYear")),
    spanish: getParam(searchParams, "c_spanish", parseInitialParam(initialSearchParams, "c_spanish")),
    otherLanguages: getParam(searchParams, "c_otherLanguages", parseInitialParam(initialSearchParams, "c_otherLanguages")),
    homeGroup: getParam(searchParams, "c_homeGroup", parseInitialParam(initialSearchParams, "c_homeGroup")),
    notes: getParam(searchParams, "c_notes", parseInitialParam(initialSearchParams, "c_notes")),
    active: getParam(searchParams, "c_active", parseInitialParam(initialSearchParams, "c_active")),
    legacyInternalId: getParam(searchParams, "c_legacyInternalId", parseInitialParam(initialSearchParams, "c_legacyInternalId")),
  }
}

function parseRecipientFiltersFromParams(
  searchParams: URLSearchParams,
  initialSearchParams: PageSearchParams
): RecipientFilterState {
  return {
    q: getParam(searchParams, "r_q", parseInitialParam(initialSearchParams, "r_q")),
    status: getParam(searchParams, "r_status", parseInitialParam(initialSearchParams, "r_status")),
    firstName: getParam(searchParams, "r_firstName", parseInitialParam(initialSearchParams, "r_firstName")),
    lastName: getParam(searchParams, "r_lastName", parseInitialParam(initialSearchParams, "r_lastName")),
    idNumber: getParam(searchParams, "r_idNumber", parseInitialParam(initialSearchParams, "r_idNumber")),
    gender: getParam(searchParams, "r_gender", parseInitialParam(initialSearchParams, "r_gender")),
    birthYear: getParam(searchParams, "r_birthYear", parseInitialParam(initialSearchParams, "r_birthYear")),
    dischargeDate: getParam(searchParams, "r_dischargeDate", parseInitialParam(initialSearchParams, "r_dischargeDate")),
    phone: getParam(searchParams, "r_phone", parseInitialParam(initialSearchParams, "r_phone")),
    facilityName: getParam(searchParams, "r_facilityName", parseInitialParam(initialSearchParams, "r_facilityName")),
    source: getParam(searchParams, "r_source", parseInitialParam(initialSearchParams, "r_source")),
    contactEmail: getParam(searchParams, "r_contactEmail", parseInitialParam(initialSearchParams, "r_contactEmail")),
    releaseAddress: getParam(searchParams, "r_releaseAddress", parseInitialParam(initialSearchParams, "r_releaseAddress")),
    releaseCity: getParam(searchParams, "r_releaseCity", parseInitialParam(initialSearchParams, "r_releaseCity")),
    releaseCounty: getParam(searchParams, "r_releaseCounty", parseInitialParam(initialSearchParams, "r_releaseCounty")),
    releaseState: getParam(searchParams, "r_releaseState", parseInitialParam(initialSearchParams, "r_releaseState")),
    releaseZip: getParam(searchParams, "r_releaseZip", parseInitialParam(initialSearchParams, "r_releaseZip")),
    notes: getParam(searchParams, "r_notes", parseInitialParam(initialSearchParams, "r_notes")),
    legacyInternalId: getParam(searchParams, "r_legacyInternalId", parseInitialParam(initialSearchParams, "r_legacyInternalId")),
  }
}

function metricDeltaClass(delta: number): string {
  if (delta > 0) return "text-emerald-600"
  if (delta < 0) return "text-rose-600"
  return "text-muted-foreground"
}

function summarizeContactFilterChips(filters: ContactFilterState): FilterChip[] {
  const chips: FilterChip[] = []

  const push = (key: keyof ContactFilterState, label: string, value = filters[key]) => {
    const trimmed = String(value ?? "").trim()
    if (!trimmed) return

    if (CONTACT_MULTI_KEYS.includes(key)) {
      for (const item of splitMultiValues(trimmed)) {
        chips.push({
          id: `${String(key)}:${item}`,
          key: String(key),
          label,
          value: item,
          multi: true,
        })
      }
      return
    }

    chips.push({
      id: String(key),
      key: String(key),
      label,
      value: trimmed,
      multi: false,
    })
  }

  push("q", "Search")
  push("active", "Active")
  push("city", "City")
  push("state", "State")
  push("county", "County")
  push("zipCode", "ZIP")
  push("firstName", "First")
  push("lastName", "Last")
  push("gender", "Gender")
  push("streetAddress", "Address")
  push("email", "Email")
  push("sobrietyDate", "Sobriety")
  push("phonePrimary", "Phone 1")
  push("phoneSecondary", "Phone 2")
  push("birthYear", "Birth Year", formatBirthYearFilterLabel(filters.birthYear))
  push("spanish", "Spanish")
  push("otherLanguages", "Languages")
  push("homeGroup", "Home Group")
  push("notes", "Notes")
  push("legacyInternalId", "Legacy ID")

  return chips
}

function summarizeRecipientFilterChips(filters: RecipientFilterState): FilterChip[] {
  const chips: FilterChip[] = []

  const push = (key: keyof RecipientFilterState, label: string, value = filters[key]) => {
    const trimmed = String(value ?? "").trim()
    if (!trimmed) return

    if (RECIPIENT_MULTI_KEYS.includes(key)) {
      for (const item of splitMultiValues(trimmed)) {
        chips.push({
          id: `${String(key)}:${item}`,
          key: String(key),
          label,
          value: item,
          multi: true,
        })
      }
      return
    }

    chips.push({
      id: String(key),
      key: String(key),
      label,
      value: trimmed,
      multi: false,
    })
  }

  push("q", "Search")
  push("status", "Status")
  push("facilityName", "Facility")
  push("source", "Source")
  push("releaseCity", "City")
  push("releaseState", "State")
  push("releaseCounty", "County")
  push("releaseZip", "ZIP")
  push("firstName", "First")
  push("lastName", "Last")
  push("idNumber", "ID")
  push("gender", "Gender")
  push("birthYear", "Birth Year", formatBirthYearFilterLabel(filters.birthYear))
  push("dischargeDate", "Discharge")
  push("phone", "Phone")
  push("contactEmail", "Email")
  push("releaseAddress", "Address")
  push("notes", "Notes")
  push("legacyInternalId", "Legacy ID")

  return chips
}

function updateObjectField<T extends Record<string, string>>(prev: T, key: keyof T, value: string): T {
  return {
    ...prev,
    [key]: value,
  }
}

function SearchableValueCombobox({
  options,
  value,
  values,
  placeholder,
  searchPlaceholder,
  onChange,
  onToggleValue,
  triggerClassName,
  closeOnSelect = true,
}: {
  options: ComboboxOption[]
  value?: string
  values?: string[]
  placeholder: string
  searchPlaceholder: string
  onChange?: (nextValue: string) => void
  onToggleValue?: (nextValue: string) => void
  triggerClassName?: string
  closeOnSelect?: boolean
}) {
  const [open, setOpen] = useState(false)

  const normalizedOptions = useMemo(
    () =>
      Array.from(
        new Map(
          options
            .map((option) => ({
              value: option.value.trim(),
              label: option.label.trim(),
            }))
            .filter((option) => option.value && option.label)
            .map((option) => [option.value.toLowerCase(), option])
        ).values()
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  )

  const selectedValues = useMemo(() => values ?? [], [values])
  const isMultiSelect = typeof onToggleValue === "function"
  const selectedOption = normalizedOptions.find((option) => norm(option.value) === norm(value ?? ""))
  const selectedOptions = normalizedOptions.filter((option) =>
    selectedValues.some((selectedValue) => norm(selectedValue) === norm(option.value))
  )

  const triggerLabel = useMemo(() => {
    if (isMultiSelect) {
      if (selectedOptions.length === 0) return placeholder
      if (selectedOptions.length === 1) return selectedOptions[0]?.label ?? placeholder
      return `${selectedOptions.length} selected`
    }

    return selectedOption?.label || placeholder
  }, [isMultiSelect, placeholder, selectedOption?.label, selectedOptions])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal focus-visible:ring-0 focus-visible:border-input", triggerClassName)}
        >
          <span className={cn("truncate", triggerLabel === placeholder && "text-muted-foreground")}>
            {triggerLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command className="rounded-md border-0">
          <CommandInput
            placeholder={searchPlaceholder}
            wrapperClassName="border-b-0 px-2 pt-2 pb-1"
            className="h-8 py-0"
          />
          <CommandList>
            <CommandEmpty>No values found.</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    if (isMultiSelect) {
                      onToggleValue?.(option.value)
                    } else {
                      onChange?.(option.value)
                    }
                    if (closeOnSelect) {
                      setOpen(false)
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      isMultiSelect
                        ? selectedValues.some((selectedValue) => norm(selectedValue) === norm(option.value))
                          ? "opacity-100"
                          : "opacity-0"
                        : norm(value ?? "") === norm(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                    )}
                  />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function MetricCard({ metric }: { metric: SummaryMetric }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="text-3xl tracking-tight">{metric.current}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>This month {metric.monthCurrent}</span>
          <span>vs prev {metric.monthPrevious}</span>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-medium", metricDeltaClass(metric.delta))}>
          {metric.delta > 0 && <ArrowUpRight className="h-3.5 w-3.5" />}
          {metric.delta < 0 && <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>{formatDelta(metric.delta)} month-over-month</span>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value}</p>
    </div>
  )
}

export function CorrectionsAdminClient({
  contacts,
  recipients,
  activeMatches,
  contactsMetrics,
  recipientMetrics,
  canEdit,
  canDelete,
  initialSearchParams,
}: CorrectionsAdminClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tab = getParam(searchParams, "tab", parseInitialParam(initialSearchParams, "tab") || "dashboard")

  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<CorrectionsContact | null>(null)
  const [editingRecipient, setEditingRecipient] = useState<CorrectionsRecipient | null>(null)
  const [viewingContact, setViewingContact] = useState<CorrectionsContact | null>(null)
  const [viewingRecipient, setViewingRecipient] = useState<CorrectionsRecipient | null>(null)
  const [deletingContact, setDeletingContact] = useState<CorrectionsContact | null>(null)
  const [deletingRecipient, setDeletingRecipient] = useState<CorrectionsRecipient | null>(null)
  const [matchingRecipient, setMatchingRecipient] = useState<CorrectionsRecipient | null>(null)
  const [statusRecipient, setStatusRecipient] = useState<CorrectionsRecipient | null>(null)
  const [isContactFilterComposerOpen, setIsContactFilterComposerOpen] = useState(false)
  const [isRecipientFilterComposerOpen, setIsRecipientFilterComposerOpen] = useState(false)

  const [newContactGender, setNewContactGender] = useState<string>(CORRECTIONS_GENDER_OPTIONS[0])
  const [newContactSpanish, setNewContactSpanish] = useState(false)
  const [newContactActive, setNewContactActive] = useState(true)

  const [editContactGender, setEditContactGender] = useState<string>(CORRECTIONS_GENDER_OPTIONS[0])
  const [editContactSpanish, setEditContactSpanish] = useState(false)
  const [editContactActive, setEditContactActive] = useState(true)

  const [newRecipientGender, setNewRecipientGender] = useState<string>(CORRECTIONS_GENDER_OPTIONS[0])
  const [newRecipientFacility, setNewRecipientFacility] = useState<string>(CORRECTIONS_FACILITY_OPTIONS[0] ?? "")
  const [newRecipientSource, setNewRecipientSource] = useState<string>(CORRECTIONS_SOURCE_OPTIONS[0] ?? "")
  const [newRecipientStatus, setNewRecipientStatus] = useState<string>("unmatched")

  const [editRecipientGender, setEditRecipientGender] = useState<string>(CORRECTIONS_GENDER_OPTIONS[0])
  const [editRecipientFacility, setEditRecipientFacility] = useState<string>("")
  const [editRecipientSource, setEditRecipientSource] = useState<string>("")
  const [editRecipientStatus, setEditRecipientStatus] = useState<string>("unmatched")

  const [contactFilters, setContactFilters] = useState<ContactFilterState>(EMPTY_CONTACT_FILTERS)
  const [recipientFilters, setRecipientFilters] = useState<RecipientFilterState>(EMPTY_RECIPIENT_FILTERS)
  const [contactFilterDrafts, setContactFilterDrafts] = useState<ContactFilterState>(EMPTY_CONTACT_FILTERS)
  const [recipientFilterDrafts, setRecipientFilterDrafts] = useState<RecipientFilterState>(EMPTY_RECIPIENT_FILTERS)
  const [contactSearchInput, setContactSearchInput] = useState("")
  const [recipientSearchInput, setRecipientSearchInput] = useState("")
  const [contactFilterField, setContactFilterField] = useState<keyof ContactFilterState>("active")
  const [recipientFilterField, setRecipientFilterField] = useState<keyof RecipientFilterState>("status")
  const initializedContactDrafts = useRef(false)
  const initializedRecipientDrafts = useRef(false)

  const contactMatchMap = useMemo(() => {
    const map = new Map<string, RecipientMatchSummary>()
    for (const match of activeMatches) {
      map.set(match.recipientId, match)
    }
    return map
  }, [activeMatches])

  const contactCities = useMemo(() => dedupeSorted(contacts.map((contact) => contact.city)), [contacts])
  const contactCounties = useMemo(() => dedupeSorted(contacts.map((contact) => contact.county)), [contacts])
  const contactStates = useMemo(() => dedupeSorted(contacts.map((contact) => contact.state)), [contacts])
  const contactZips = useMemo(() => dedupeSorted(contacts.map((contact) => contact.zipCode)), [contacts])

  const recipientCities = useMemo(() => dedupeSorted(recipients.map((recipient) => recipient.releaseCity)), [recipients])
  const recipientCounties = useMemo(
    () => dedupeSorted(recipients.map((recipient) => recipient.releaseCounty)),
    [recipients]
  )
  const recipientStates = useMemo(() => dedupeSorted(recipients.map((recipient) => recipient.releaseState)), [recipients])
  const recipientZips = useMemo(() => dedupeSorted(recipients.map((recipient) => recipient.releaseZip)), [recipients])

  const facilityOptions = useMemo(
    () => dedupeSorted([...CORRECTIONS_FACILITY_OPTIONS, ...recipients.map((recipient) => recipient.facilityName)]),
    [recipients]
  )

  const sourceOptions = useMemo(
    () => dedupeSorted([...CORRECTIONS_SOURCE_OPTIONS, ...recipients.map((recipient) => recipient.source)]),
    [recipients]
  )

  const contactFilterDescriptors = useMemo<FilterDescriptor<ContactFilterState>[]>(() => {
    return [
      { key: "active", label: "Activity", kind: "select", options: ["active", "inactive"] },
      { key: "spanish", label: "Spanish", kind: "select", options: ["yes", "no"] },
      { key: "gender", label: "Gender", kind: "select", options: [...CORRECTIONS_GENDER_OPTIONS] },
      { key: "city", label: "City", kind: "select", options: contactCities },
      { key: "county", label: "County", kind: "select", options: contactCounties },
      { key: "state", label: "State", kind: "select", options: contactStates },
      { key: "zipCode", label: "ZIP", kind: "select", options: contactZips },
      { key: "firstName", label: "First Name", kind: "text" },
      { key: "lastName", label: "Last Name", kind: "text" },
      { key: "streetAddress", label: "Street Address", kind: "text" },
      { key: "email", label: "Email", kind: "text" },
      { key: "sobrietyDate", label: "Sobriety Date", kind: "text" },
      { key: "phonePrimary", label: "Phone 1", kind: "text" },
      { key: "phoneSecondary", label: "Phone 2", kind: "text" },
      { key: "birthYear", label: "Birth Year", kind: "birthYear" },
      { key: "otherLanguages", label: "Other Languages", kind: "text" },
      { key: "homeGroup", label: "Home Group", kind: "text" },
      { key: "notes", label: "Notes", kind: "text" },
      { key: "legacyInternalId", label: "Legacy ID", kind: "text" },
    ]
  }, [contactCities, contactCounties, contactStates, contactZips])

  const recipientFilterDescriptors = useMemo<FilterDescriptor<RecipientFilterState>[]>(() => {
    return [
      { key: "status", label: "Status", kind: "select", options: [...RECIPIENT_STATUS_OPTIONS] },
      { key: "facilityName", label: "Facility", kind: "select", options: facilityOptions },
      { key: "source", label: "Source", kind: "select", options: sourceOptions },
      { key: "releaseCity", label: "Release City", kind: "select", options: recipientCities },
      { key: "releaseCounty", label: "Release County", kind: "select", options: recipientCounties },
      { key: "releaseState", label: "Release State", kind: "select", options: recipientStates },
      { key: "releaseZip", label: "Release ZIP", kind: "select", options: recipientZips },
      { key: "gender", label: "Gender", kind: "select", options: [...CORRECTIONS_GENDER_OPTIONS] },
      { key: "firstName", label: "First Name", kind: "text" },
      { key: "lastName", label: "Last Name", kind: "text" },
      { key: "idNumber", label: "ID Number", kind: "text" },
      { key: "birthYear", label: "Birth Year", kind: "birthYear" },
      { key: "dischargeDate", label: "Discharge Date", kind: "text" },
      { key: "phone", label: "Phone", kind: "text" },
      { key: "contactEmail", label: "Contact Email", kind: "text" },
      { key: "releaseAddress", label: "Release Address", kind: "text" },
      { key: "notes", label: "Notes", kind: "text" },
      { key: "legacyInternalId", label: "Legacy ID", kind: "text" },
    ]
  }, [facilityOptions, sourceOptions, recipientCities, recipientCounties, recipientStates, recipientZips])

  const contactFieldOptions = useMemo<ComboboxOption[]>(
    () =>
      contactFilterDescriptors.map((descriptor) => ({
        value: String(descriptor.key),
        label: descriptor.label,
      })),
    [contactFilterDescriptors]
  )

  const recipientFieldOptions = useMemo<ComboboxOption[]>(
    () =>
      recipientFilterDescriptors.map((descriptor) => ({
        value: String(descriptor.key),
        label: descriptor.label,
      })),
    [recipientFilterDescriptors]
  )

  const selectedContactFilterDescriptor = useMemo(
    () => contactFilterDescriptors.find((descriptor) => descriptor.key === contactFilterField) ?? contactFilterDescriptors[0],
    [contactFilterDescriptors, contactFilterField]
  )

  const selectedRecipientFilterDescriptor = useMemo(
    () =>
      recipientFilterDescriptors.find((descriptor) => descriptor.key === recipientFilterField) ??
      recipientFilterDescriptors[0],
    [recipientFilterDescriptors, recipientFilterField]
  )

  const selectedContactDraftValue = contactFilterDrafts[contactFilterField] ?? ""
  const selectedRecipientDraftValue = recipientFilterDrafts[recipientFilterField] ?? ""

  useEffect(() => {
    const parsed = parseContactFiltersFromParams(searchParams, initialSearchParams)
    setContactFilters(parsed)
    if (!initializedContactDrafts.current) {
      setContactFilterDrafts(parsed)
      initializedContactDrafts.current = true
    }
  }, [searchParams, initialSearchParams])

  useEffect(() => {
    const parsed = parseRecipientFiltersFromParams(searchParams, initialSearchParams)
    setRecipientFilters(parsed)
    if (!initializedRecipientDrafts.current) {
      setRecipientFilterDrafts(parsed)
      initializedRecipientDrafts.current = true
    }
  }, [searchParams, initialSearchParams])

  useEffect(() => {
    setContactSearchInput((prev) => (prev === contactFilters.q ? prev : contactFilters.q))
  }, [contactFilters.q])

  useEffect(() => {
    setRecipientSearchInput((prev) => (prev === recipientFilters.q ? prev : recipientFilters.q))
  }, [recipientFilters.q])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setContactFilters((prev) => (prev.q === contactSearchInput ? prev : updateObjectField(prev, "q", contactSearchInput)))
    }, 180)
    return () => clearTimeout(timeout)
  }, [contactSearchInput])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRecipientFilters((prev) =>
        prev.q === recipientSearchInput ? prev : updateObjectField(prev, "q", recipientSearchInput)
      )
    }, 180)
    return () => clearTimeout(timeout)
  }, [recipientSearchInput])

  useEffect(() => {
    if (!editingContact) return
    setEditContactGender(normalizeGender(editingContact.gender) ?? CORRECTIONS_GENDER_OPTIONS[0])
    setEditContactSpanish(editingContact.isSpanishSpeaking)
    setEditContactActive(editingContact.active)
  }, [editingContact])

  useEffect(() => {
    if (!editingRecipient) return
    setEditRecipientGender(normalizeGender(editingRecipient.gender) ?? CORRECTIONS_GENDER_OPTIONS[0])
    setEditRecipientFacility(editingRecipient.facilityName)
    setEditRecipientSource(editingRecipient.source)
    setEditRecipientStatus(editingRecipient.status)
  }, [editingRecipient])

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (!matchesMultiSelectExact(contact.active ? "active" : "inactive", contactFilters.active)) return false
      if (!matchesMultiSelectExact(contact.isSpanishSpeaking ? "yes" : "no", contactFilters.spanish)) return false

      if (!matchesBirthYearFilter(contact.birthYear, contactFilters.birthYear)) return false

      if (!stringIncludes(contact.firstName, contactFilters.firstName)) return false
      if (!stringIncludes(contact.lastName, contactFilters.lastName)) return false
      if (!matchesMultiSelectExact(normalizeGender(contact.gender) ?? contact.gender, contactFilters.gender)) return false
      if (!stringIncludes(contact.streetAddress, contactFilters.streetAddress)) return false
      if (!matchesMultiSelectExact(contact.city, contactFilters.city)) return false
      if (!matchesMultiSelectExact(contact.county, contactFilters.county)) return false
      if (!matchesMultiSelectExact(contact.state, contactFilters.state)) return false
      if (!matchesMultiSelectExact(contact.zipCode, contactFilters.zipCode)) return false
      if (!stringIncludes(contact.email, contactFilters.email)) return false
      if (!stringIncludes(contact.sobrietyDate, contactFilters.sobrietyDate)) return false
      if (!stringIncludes(contact.phonePrimary, contactFilters.phonePrimary)) return false
      if (!stringIncludes(contact.phoneSecondary, contactFilters.phoneSecondary)) return false
      if (!stringIncludes(contact.otherLanguages, contactFilters.otherLanguages)) return false
      if (!stringIncludes(contact.homeGroup, contactFilters.homeGroup)) return false
      if (!stringIncludes(contact.notes, contactFilters.notes)) return false
      if (!stringIncludes(contact.legacyInternalId, contactFilters.legacyInternalId)) return false

      if (contactFilters.q) {
        const haystack = [
          contact.firstName,
          contact.lastName,
          contact.gender,
          contact.streetAddress,
          contact.city,
          contact.county,
          contact.state,
          contact.zipCode,
          contact.email,
          contact.phonePrimary,
          contact.phoneSecondary,
          contact.homeGroup,
          contact.otherLanguages,
          contact.notes,
          contact.legacyInternalId,
        ]
          .map((value) => String(value ?? ""))
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(contactFilters.q.toLowerCase())) return false
      }

      return true
    })
  }, [contacts, contactFilters])

  const filteredRecipients = useMemo(() => {
    return recipients.filter((recipient) => {
      if (!matchesMultiSelectExact(recipient.status, recipientFilters.status)) return false
      if (!matchesBirthYearFilter(recipient.birthYear, recipientFilters.birthYear)) return false

      if (!stringIncludes(recipient.firstName, recipientFilters.firstName)) return false
      if (!stringIncludes(recipient.lastName, recipientFilters.lastName)) return false
      if (!stringIncludes(recipient.idNumber, recipientFilters.idNumber)) return false
      if (!matchesMultiSelectExact(normalizeGender(recipient.gender) ?? recipient.gender, recipientFilters.gender)) return false
      if (!stringIncludes(recipient.dischargeDate, recipientFilters.dischargeDate)) return false
      if (!stringIncludes(recipient.phone, recipientFilters.phone)) return false
      if (!matchesMultiSelectExact(recipient.facilityName, recipientFilters.facilityName)) return false
      if (!matchesMultiSelectExact(recipient.source, recipientFilters.source)) return false
      if (!stringIncludes(recipient.contactEmail, recipientFilters.contactEmail)) return false
      if (!stringIncludes(recipient.releaseAddress, recipientFilters.releaseAddress)) return false
      if (!matchesMultiSelectExact(recipient.releaseCity, recipientFilters.releaseCity)) return false
      if (!matchesMultiSelectExact(recipient.releaseCounty, recipientFilters.releaseCounty)) return false
      if (!matchesMultiSelectExact(recipient.releaseState, recipientFilters.releaseState)) return false
      if (!matchesMultiSelectExact(recipient.releaseZip, recipientFilters.releaseZip)) return false
      if (!stringIncludes(recipient.notes, recipientFilters.notes)) return false
      if (!stringIncludes(recipient.legacyInternalId, recipientFilters.legacyInternalId)) return false

      if (recipientFilters.q) {
        const haystack = [
          recipient.firstName,
          recipient.lastName,
          recipient.idNumber,
          recipient.gender,
          recipient.phone,
          recipient.facilityName,
          recipient.source,
          recipient.contactEmail,
          recipient.releaseAddress,
          recipient.releaseCity,
          recipient.releaseCounty,
          recipient.releaseState,
          recipient.releaseZip,
          recipient.notes,
          recipient.status,
          recipient.legacyInternalId,
        ]
          .map((value) => String(value ?? ""))
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(recipientFilters.q.toLowerCase())) return false
      }

      return true
    })
  }, [recipients, recipientFilters])

  const activeContacts = useMemo(
    () => filteredContacts.filter((contact) => contact.active),
    [filteredContacts]
  )

  const inactiveContacts = useMemo(
    () => filteredContacts.filter((contact) => !contact.active),
    [filteredContacts]
  )

  const matchCandidates = useMemo(() => {
    if (!matchingRecipient) return []
    return rankContactsForRecipient(matchingRecipient, contacts).slice(0, 60)
  }, [matchingRecipient, contacts])

  const contactFilterChips = useMemo(() => summarizeContactFilterChips(contactFilters), [contactFilters])
  const recipientFilterChips = useMemo(() => summarizeRecipientFilterChips(recipientFilters), [recipientFilters])

  function replaceParams(updates: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      const normalized = String(value ?? "").trim()
      if (!normalized) {
        next.delete(key)
      } else {
        next.set(key, normalized)
      }
    }

    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function applyContactFilters(nextFilters = contactFilters) {
    replaceParams({
      tab: "contacts",
      c_q: nextFilters.q,
      c_firstName: nextFilters.firstName,
      c_lastName: nextFilters.lastName,
      c_gender: nextFilters.gender,
      c_streetAddress: nextFilters.streetAddress,
      c_city: nextFilters.city,
      c_county: nextFilters.county,
      c_state: nextFilters.state,
      c_zipCode: nextFilters.zipCode,
      c_email: nextFilters.email,
      c_sobrietyDate: nextFilters.sobrietyDate,
      c_phonePrimary: nextFilters.phonePrimary,
      c_phoneSecondary: nextFilters.phoneSecondary,
      c_birthYear: nextFilters.birthYear,
      c_spanish: nextFilters.spanish,
      c_otherLanguages: nextFilters.otherLanguages,
      c_homeGroup: nextFilters.homeGroup,
      c_notes: nextFilters.notes,
      c_active: nextFilters.active,
      c_legacyInternalId: nextFilters.legacyInternalId,
    })
  }

  function applyRecipientFilters(nextFilters = recipientFilters) {
    replaceParams({
      tab: "recipients",
      r_q: nextFilters.q,
      r_status: nextFilters.status,
      r_firstName: nextFilters.firstName,
      r_lastName: nextFilters.lastName,
      r_idNumber: nextFilters.idNumber,
      r_gender: nextFilters.gender,
      r_birthYear: nextFilters.birthYear,
      r_dischargeDate: nextFilters.dischargeDate,
      r_phone: nextFilters.phone,
      r_facilityName: nextFilters.facilityName,
      r_source: nextFilters.source,
      r_contactEmail: nextFilters.contactEmail,
      r_releaseAddress: nextFilters.releaseAddress,
      r_releaseCity: nextFilters.releaseCity,
      r_releaseCounty: nextFilters.releaseCounty,
      r_releaseState: nextFilters.releaseState,
      r_releaseZip: nextFilters.releaseZip,
      r_notes: nextFilters.notes,
      r_legacyInternalId: nextFilters.legacyInternalId,
    })
  }

  function clearContactFilters() {
    setContactFilters(EMPTY_CONTACT_FILTERS)
    setContactFilterDrafts(EMPTY_CONTACT_FILTERS)
    applyContactFilters(EMPTY_CONTACT_FILTERS)
  }

  function clearRecipientFilters() {
    setRecipientFilters(EMPTY_RECIPIENT_FILTERS)
    setRecipientFilterDrafts(EMPTY_RECIPIENT_FILTERS)
    applyRecipientFilters(EMPTY_RECIPIENT_FILTERS)
  }

  function addContactFilterChip() {
    if (!selectedContactFilterDescriptor) return
    const rawValue = selectedContactDraftValue.trim()
    const value =
      selectedContactFilterDescriptor.kind === "birthYear"
        ? normalizeBirthYearFilter(rawValue)
        : rawValue
    if (!value) return
    if (selectedContactFilterDescriptor.kind === "birthYear" && !parseBirthYearFilter(value)) return
    const nextValue = selectedContactFilterDescriptor.kind === "select"
      ? joinMultiValues([
          ...splitMultiValues(contactFilters[selectedContactFilterDescriptor.key]),
          ...splitMultiValues(value),
        ])
      : value
    const next = updateObjectField(contactFilters, selectedContactFilterDescriptor.key, nextValue)
    setContactFilters(next)
    applyContactFilters(next)
  }

  function addRecipientFilterChip() {
    if (!selectedRecipientFilterDescriptor) return
    const rawValue = selectedRecipientDraftValue.trim()
    const value =
      selectedRecipientFilterDescriptor.kind === "birthYear"
        ? normalizeBirthYearFilter(rawValue)
        : rawValue
    if (!value) return
    if (selectedRecipientFilterDescriptor.kind === "birthYear" && !parseBirthYearFilter(value)) return
    const nextValue = selectedRecipientFilterDescriptor.kind === "select"
      ? joinMultiValues([
          ...splitMultiValues(recipientFilters[selectedRecipientFilterDescriptor.key]),
          ...splitMultiValues(value),
        ])
      : value
    const next = updateObjectField(recipientFilters, selectedRecipientFilterDescriptor.key, nextValue)
    setRecipientFilters(next)
    applyRecipientFilters(next)
  }

  function toggleContactSelectValue(nextValue: string) {
    if (!selectedContactFilterDescriptor || selectedContactFilterDescriptor.kind !== "select") return
    const current = contactFilterDrafts[selectedContactFilterDescriptor.key]
    const combined = includesMultiValue(current, nextValue)
      ? removeMultiValue(current, nextValue)
      : appendMultiValue(current, nextValue)
    setContactFilterDrafts((prev) => updateObjectField(prev, selectedContactFilterDescriptor.key, combined))
  }

  function toggleRecipientSelectValue(nextValue: string) {
    if (!selectedRecipientFilterDescriptor || selectedRecipientFilterDescriptor.kind !== "select") return
    const current = recipientFilterDrafts[selectedRecipientFilterDescriptor.key]
    const combined = includesMultiValue(current, nextValue)
      ? removeMultiValue(current, nextValue)
      : appendMultiValue(current, nextValue)
    setRecipientFilterDrafts((prev) => updateObjectField(prev, selectedRecipientFilterDescriptor.key, combined))
  }

  function applyContactShortcut(key: keyof ContactFilterState, value: string) {
    const current = contactFilters[key]
    const nextValue = includesMultiValue(current, value)
      ? removeMultiValue(current, value)
      : appendMultiValue(current, value)
    const next = updateObjectField(contactFilters, key, nextValue)
    setContactFilters(next)
  }

  function applyRecipientShortcut(key: keyof RecipientFilterState, value: string) {
    const current = recipientFilters[key]
    const nextValue = includesMultiValue(current, value)
      ? removeMultiValue(current, value)
      : appendMultiValue(current, value)
    const next = updateObjectField(recipientFilters, key, nextValue)
    setRecipientFilters(next)
  }

  function removeContactChip(chip: FilterChip) {
    const filterKey = chip.key as keyof ContactFilterState
    const nextValue = chip.multi ? removeMultiValue(contactFilters[filterKey], chip.value) : ""
    const next = updateObjectField(contactFilters, filterKey, nextValue)
    setContactFilters(next)
  }

  function removeRecipientChip(chip: FilterChip) {
    const filterKey = chip.key as keyof RecipientFilterState
    const nextValue = chip.multi ? removeMultiValue(recipientFilters[filterKey], chip.value) : ""
    const next = updateObjectField(recipientFilters, filterKey, nextValue)
    setRecipientFilters(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Corrections Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage contacts and recipients, run location-based matching, and share filtered views by URL.
          </p>
        </div>
        <Badge variant={canEdit ? "default" : "secondary"}>{canEdit ? "Edit Access" : "View Only"}</Badge>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          replaceParams({ tab: value, matchRecipient: null })
        }}
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UsersRound className="h-4 w-4" />
              Contacts
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {contactsMetrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserRoundSearch className="h-4 w-4" />
              Recipients
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recipientMetrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Contact Directory</CardTitle>
              <CardDescription>
                Build filters field-by-field, add them as badges, and share the current view via URL params.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-gradient-to-b from-muted/25 via-background to-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full space-y-2 lg:max-w-2xl">
                    <Label
                      htmlFor="contacts-filter-search"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Search Contacts
                    </Label>
                    <div className="relative rounded-md border border-input bg-background transition-[border-color,box-shadow] shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="contacts-filter-search"
                        className="border-0 pl-9 shadow-none focus-visible:ring-0"
                        value={contactSearchInput}
                        onChange={(event) => setContactSearchInput(event.target.value)}
                        placeholder="Name, phone, location, home group, or notes..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Popover open={isContactFilterComposerOpen} onOpenChange={setIsContactFilterComposerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          Add Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[430px] p-0">
                        <div className="border-b border-border/70 p-3">
                          <p className="text-sm font-semibold">Add Contact Filter</p>
                          <p className="text-xs text-muted-foreground">Select a field and value to add a badge.</p>
                        </div>

                        <div className="space-y-3 p-3">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Field</Label>
                            <SearchableValueCombobox
                              options={contactFieldOptions}
                              value={String(contactFilterField)}
                              placeholder="Select field"
                              searchPlaceholder="Search filter fields..."
                              onChange={(nextValue) => setContactFilterField(nextValue as keyof ContactFilterState)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
                            {selectedContactFilterDescriptor?.kind === "select" ? (
                              <SearchableValueCombobox
                                options={(selectedContactFilterDescriptor.options ?? []).map((option) => ({
                                  value: option,
                                  label: option,
                                }))}
                                values={splitMultiValues(selectedContactDraftValue)}
                                placeholder="Select value(s)"
                                searchPlaceholder="Search values..."
                                closeOnSelect={false}
                                onToggleValue={(nextValue) => toggleContactSelectValue(nextValue)}
                              />
                            ) : (
                              <div className="rounded-md border border-input bg-background transition-[border-color,box-shadow] shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                                <Input
                                  className="border-0 shadow-none focus-visible:ring-0"
                                  value={selectedContactDraftValue}
                                  onChange={(event) =>
                                    setContactFilterDrafts((prev) =>
                                      updateObjectField(prev, contactFilterField, event.target.value)
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault()
                                      addContactFilterChip()
                                    }
                                  }}
                                  placeholder={
                                    selectedContactFilterDescriptor?.kind === "birthYear"
                                      ? "YYYY or YYYY-YYYY"
                                      : "Type a value"
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={addContactFilterChip}>
                              Add Value
                            </Button>
                            <Button variant="ghost" onClick={() => setIsContactFilterComposerOpen(false)}>
                              Done
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button variant="outline" onClick={clearContactFilters}>
                      Clear
                    </Button>
                    {canEdit && (
                      <Button onClick={() => setIsAddContactOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    Quick Filters
                  </Badge>
                  <Button
                    variant={includesMultiValue(contactFilters.active, "active") ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyContactShortcut("active", "active")}
                  >
                    Active
                  </Button>
                  <Button
                    variant={includesMultiValue(contactFilters.active, "inactive") ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyContactShortcut("active", "inactive")}
                  >
                    Inactive
                  </Button>
                  <Button
                    variant={includesMultiValue(contactFilters.spanish, "yes") ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyContactShortcut("spanish", "yes")}
                  >
                    Spanish
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border/70 bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Filters</p>
                  <Badge variant="secondary">{contactFilterChips.length}</Badge>
                </div>

                <ScrollArea className="mt-2 w-full whitespace-nowrap">
                  <div className="flex min-h-8 flex-wrap gap-2 pb-1">
                    {contactFilterChips.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No filters applied.</span>
                    ) : (
                      contactFilterChips.map((chip) => (
                        <Badge key={chip.id} variant="outline" className="gap-1 pr-1">
                          <span>{chip.label}: {chip.value}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-muted-foreground hover:text-foreground"
                            onClick={() => removeContactChip(chip)}
                            aria-label={`Remove ${chip.label} filter`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Contacts ({activeContacts.length})</CardTitle>
              <CardDescription>Current volunteers used for matching.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active contacts match this filter.</p>
              ) : (
                <ScrollArea className="h-[640px] pr-3">
                  <div className="space-y-2">
                    {activeContacts.map((contact) => (
                      <div
                        key={contact.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`View contact ${contact.firstName} ${contact.lastName}`}
                        onClick={() => setViewingContact(contact)}
                        onKeyDown={(event) => {
                          if (event.currentTarget !== event.target) return
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            setViewingContact(contact)
                          }
                        }}
                        className="rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {normalizeGender(contact.gender) ?? contact.gender} • {contact.city}
                              {contact.state ? `, ${contact.state}` : ""}
                              {contact.zipCode ? ` ${contact.zipCode}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contact.email ?? "No email"}
                              {contact.phonePrimary ? ` • ${contact.phonePrimary}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contact.homeGroup ? `Home Group: ${contact.homeGroup}` : "Home Group: -"}
                            </p>
                          </div>
                          {(canEdit || canDelete) && (
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setEditingContact(contact)
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setDeletingContact(contact)
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="inactive-history" className="border-b-0">
                  <AccordionTrigger className="py-2">
                    <div className="text-left">
                      <p className="font-medium">Inactive Contacts (Historical) ({inactiveContacts.length})</p>
                      <p className="text-xs text-muted-foreground">
                        Archived records that are not prioritized for matching.
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {inactiveContacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No inactive contacts match this filter.</p>
                    ) : (
                      <ScrollArea className="h-[320px] pr-3">
                        <div className="space-y-2">
                          {inactiveContacts.map((contact) => (
                            <div
                              key={contact.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`View contact ${contact.firstName} ${contact.lastName}`}
                              onClick={() => setViewingContact(contact)}
                              onKeyDown={(event) => {
                                if (event.currentTarget !== event.target) return
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  setViewingContact(contact)
                                }
                              }}
                              className="rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    {contact.firstName} {contact.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {normalizeGender(contact.gender) ?? contact.gender} • {contact.city}
                                    {contact.state ? `, ${contact.state}` : ""}
                                    {contact.zipCode ? ` ${contact.zipCode}` : ""}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {contact.email ?? "No email"}
                                    {contact.phonePrimary ? ` • ${contact.phonePrimary}` : ""}
                                  </p>
                                </div>
                                {(canEdit || canDelete) && (
                                  <div className="flex items-center gap-2">
                                    {canEdit && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          setEditingContact(contact)
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          setDeletingContact(contact)
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Recipient Queue</CardTitle>
              <CardDescription>
                Add filters badge-by-badge, match by location, and manage lifecycle status in modal workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-gradient-to-b from-muted/25 via-background to-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full space-y-2 lg:max-w-2xl">
                    <Label
                      htmlFor="recipients-filter-search"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Search Recipients
                    </Label>
                    <div className="relative rounded-md border border-input bg-background transition-[border-color,box-shadow] shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="recipients-filter-search"
                        className="border-0 pl-9 shadow-none focus-visible:ring-0"
                        value={recipientSearchInput}
                        onChange={(event) => setRecipientSearchInput(event.target.value)}
                        placeholder="Name, ID number, facility, source, location, or notes..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Popover open={isRecipientFilterComposerOpen} onOpenChange={setIsRecipientFilterComposerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          Add Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[430px] p-0">
                        <div className="border-b border-border/70 p-3">
                          <p className="text-sm font-semibold">Add Recipient Filter</p>
                          <p className="text-xs text-muted-foreground">Select a field and value to add a badge.</p>
                        </div>

                        <div className="space-y-3 p-3">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Field</Label>
                            <SearchableValueCombobox
                              options={recipientFieldOptions}
                              value={String(recipientFilterField)}
                              placeholder="Select field"
                              searchPlaceholder="Search filter fields..."
                              onChange={(nextValue) => setRecipientFilterField(nextValue as keyof RecipientFilterState)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
                            {selectedRecipientFilterDescriptor?.kind === "select" ? (
                              <SearchableValueCombobox
                                options={(selectedRecipientFilterDescriptor.options ?? []).map((option) => ({
                                  value: option,
                                  label: option,
                                }))}
                                values={splitMultiValues(selectedRecipientDraftValue)}
                                placeholder="Select value(s)"
                                searchPlaceholder="Search values..."
                                closeOnSelect={false}
                                onToggleValue={(nextValue) => toggleRecipientSelectValue(nextValue)}
                              />
                            ) : (
                              <div className="rounded-md border border-input bg-background transition-[border-color,box-shadow] shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                                <Input
                                  className="border-0 shadow-none focus-visible:ring-0"
                                  value={selectedRecipientDraftValue}
                                  onChange={(event) =>
                                    setRecipientFilterDrafts((prev) =>
                                      updateObjectField(prev, recipientFilterField, event.target.value)
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault()
                                      addRecipientFilterChip()
                                    }
                                  }}
                                  placeholder={
                                    selectedRecipientFilterDescriptor?.kind === "birthYear"
                                      ? "YYYY or YYYY-YYYY"
                                      : "Type a value"
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={addRecipientFilterChip}>
                              Add Value
                            </Button>
                            <Button variant="ghost" onClick={() => setIsRecipientFilterComposerOpen(false)}>
                              Done
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button variant="outline" onClick={clearRecipientFilters}>
                      Clear
                    </Button>
                    {canEdit && (
                      <Button onClick={() => setIsAddRecipientOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Recipient
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    Quick Filters
                  </Badge>
                  <Button
                    variant={includesMultiValue(recipientFilters.status, "unmatched") ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyRecipientShortcut("status", "unmatched")}
                  >
                    Unmatched
                  </Button>
                  <Button
                    variant={includesMultiValue(recipientFilters.status, "pending") ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyRecipientShortcut("status", "pending")}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={includesMultiValue(recipientFilters.status, "completed") ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyRecipientShortcut("status", "completed")}
                  >
                    Completed
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border/70 bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Filters</p>
                  <Badge variant="secondary">{recipientFilterChips.length}</Badge>
                </div>

                <ScrollArea className="mt-2 w-full whitespace-nowrap">
                  <div className="flex min-h-8 flex-wrap gap-2 pb-1">
                    {recipientFilterChips.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No filters applied.</span>
                    ) : (
                      recipientFilterChips.map((chip) => (
                        <Badge key={chip.id} variant="outline" className="gap-1 pr-1">
                          <span>{chip.label}: {chip.value}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-muted-foreground hover:text-foreground"
                            onClick={() => removeRecipientChip(chip)}
                            aria-label={`Remove ${chip.label} filter`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipients ({filteredRecipients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipients match this filter.</p>
              ) : (
                <ScrollArea className="h-[640px] pr-3">
                  <div className="space-y-2">
                    {filteredRecipients.map((recipient) => {
                      const match = contactMatchMap.get(recipient.id)

                      return (
                        <div
                          key={recipient.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`View recipient ${recipient.firstName} ${recipient.lastName}`}
                          onClick={() => setViewingRecipient(recipient)}
                          onKeyDown={(event) => {
                            if (event.currentTarget !== event.target) return
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              setViewingRecipient(recipient)
                            }
                          }}
                          className="rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <Badge variant="outline" className={cn("mb-1", statusBadgeClass(recipient.status))}>
                                {formatStatusLabel(recipient.status)}
                              </Badge>
                              <p className="font-medium">
                                {recipient.firstName} {recipient.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID {recipient.idNumber} • {normalizeGender(recipient.gender) ?? recipient.gender} • {recipient.facilityName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Release: {recipient.releaseCity || "Unknown city"}
                                {recipient.releaseState ? `, ${recipient.releaseState}` : ""}
                                {recipient.releaseZip ? ` ${recipient.releaseZip}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Discharge: {recipient.dischargeDate || "-"}
                              </p>
                              {match && <p className="text-xs text-primary">Matched with: {match.contactName}</p>}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setMatchingRecipient(recipient)
                                }}
                              >
                                Find Match
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setStatusRecipient(recipient)
                                  }}
                                >
                                  Update Status
                                </Button>
                              )}
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setEditingRecipient(recipient)
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setDeletingRecipient(recipient)
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!viewingContact}
        onOpenChange={(open) => {
          if (!open) setViewingContact(null)
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Contact Details{viewingContact ? `: ${viewingContact.firstName} ${viewingContact.lastName}` : ""}
            </DialogTitle>
            <DialogDescription>Complete contact profile information.</DialogDescription>
          </DialogHeader>

          {viewingContact && (
            <ScrollArea className="max-h-[72vh] pr-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={viewingContact.active ? "default" : "secondary"}>
                    {viewingContact.active ? "Active" : "Inactive"}
                  </Badge>
                  {viewingContact.isSpanishSpeaking && <Badge variant="outline">Spanish-speaking</Badge>}
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="First Name" value={formatDetailValue(viewingContact.firstName)} />
                    <DetailItem label="Last Name" value={formatDetailValue(viewingContact.lastName)} />
                    <DetailItem label="Gender" value={formatDetailValue(normalizeGender(viewingContact.gender) ?? viewingContact.gender)} />
                    <DetailItem label="Birth Year" value={formatDetailValue(viewingContact.birthYear)} />
                    <DetailItem label="Sobriety Date" value={formatDetailValue(viewingContact.sobrietyDate)} />
                    <DetailItem label="Home Group" value={formatDetailValue(viewingContact.homeGroup)} />
                    <DetailItem label="Other Languages" value={formatDetailValue(viewingContact.otherLanguages)} />
                    <DetailItem label="Email" value={formatDetailValue(viewingContact.email)} />
                    <DetailItem label="Phone 1" value={formatDetailValue(viewingContact.phonePrimary)} />
                    <DetailItem label="Phone 2" value={formatDetailValue(viewingContact.phoneSecondary)} />
                    <DetailItem label="Street Address" value={formatDetailValue(viewingContact.streetAddress)} />
                    <DetailItem label="City" value={formatDetailValue(viewingContact.city)} />
                    <DetailItem label="County" value={formatDetailValue(viewingContact.county)} />
                    <DetailItem label="State" value={formatDetailValue(viewingContact.state)} />
                    <DetailItem label="ZIP" value={formatDetailValue(viewingContact.zipCode)} />
                    <DetailItem label="Legacy Source" value={formatDetailValue(viewingContact.legacySourcePage)} />
                    <DetailItem label="Legacy ID" value={formatDetailValue(viewingContact.legacyInternalId)} />
                    <DetailItem label="Record ID" value={formatDetailValue(viewingContact.id)} />
                    <div className="sm:col-span-2">
                      <DetailItem label="Notes" value={formatDetailValue(viewingContact.notes)} />
                    </div>
                    <DetailItem label="Created At" value={formatDetailValue(viewingContact.createdAt)} />
                    <DetailItem label="Updated At" value={formatDetailValue(viewingContact.updatedAt)} />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingRecipient}
        onOpenChange={(open) => {
          if (!open) setViewingRecipient(null)
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Recipient Details{viewingRecipient ? `: ${viewingRecipient.firstName} ${viewingRecipient.lastName}` : ""}
            </DialogTitle>
            <DialogDescription>Complete recipient profile information.</DialogDescription>
          </DialogHeader>

          {viewingRecipient && (
            <ScrollArea className="max-h-[72vh] pr-4">
              <div className="space-y-4">
                <Badge variant="outline" className={cn(statusBadgeClass(viewingRecipient.status))}>
                  {formatStatusLabel(viewingRecipient.status)}
                </Badge>

                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="First Name" value={formatDetailValue(viewingRecipient.firstName)} />
                    <DetailItem label="Last Name" value={formatDetailValue(viewingRecipient.lastName)} />
                    <DetailItem label="ID Number" value={formatDetailValue(viewingRecipient.idNumber)} />
                    <DetailItem label="Gender" value={formatDetailValue(normalizeGender(viewingRecipient.gender) ?? viewingRecipient.gender)} />
                    <DetailItem label="Birth Year" value={formatDetailValue(viewingRecipient.birthYear)} />
                    <DetailItem label="Discharge Date" value={formatDetailValue(viewingRecipient.dischargeDate)} />
                    <DetailItem label="Facility" value={formatDetailValue(viewingRecipient.facilityName)} />
                    <DetailItem label="Source" value={formatDetailValue(viewingRecipient.source)} />
                    <DetailItem label="Phone" value={formatDetailValue(viewingRecipient.phone)} />
                    <DetailItem label="Contact Email" value={formatDetailValue(viewingRecipient.contactEmail)} />
                    <DetailItem label="Release Address" value={formatDetailValue(viewingRecipient.releaseAddress)} />
                    <DetailItem label="Release City" value={formatDetailValue(viewingRecipient.releaseCity)} />
                    <DetailItem label="Release County" value={formatDetailValue(viewingRecipient.releaseCounty)} />
                    <DetailItem label="Release State" value={formatDetailValue(viewingRecipient.releaseState)} />
                    <DetailItem label="Release ZIP" value={formatDetailValue(viewingRecipient.releaseZip)} />
                    <DetailItem label="Legacy Source" value={formatDetailValue(viewingRecipient.legacySourcePage)} />
                    <DetailItem label="Legacy ID" value={formatDetailValue(viewingRecipient.legacyInternalId)} />
                    <DetailItem label="Record ID" value={formatDetailValue(viewingRecipient.id)} />
                    <div className="sm:col-span-2">
                      <DetailItem label="Notes" value={formatDetailValue(viewingRecipient.notes)} />
                    </div>
                    <DetailItem label="Created At" value={formatDetailValue(viewingRecipient.createdAt)} />
                    <DetailItem label="Updated At" value={formatDetailValue(viewingRecipient.updatedAt)} />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => {
          if (!open) setDeletingContact(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Contact{deletingContact ? `: ${deletingContact.firstName} ${deletingContact.lastName}` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the contact. Any active matches tied to this contact will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deletingContact && (
              <form
                action={deleteCorrectionsContact}
                onSubmit={() => {
                  setDeletingContact(null)
                }}
              >
                <input type="hidden" name="contactId" value={deletingContact.id} />
                <FormSubmitButton variant="destructive" pendingText="Deleting...">
                  Delete Contact
                </FormSubmitButton>
              </form>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingRecipient}
        onOpenChange={(open) => {
          if (!open) setDeletingRecipient(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Recipient
              {deletingRecipient ? `: ${deletingRecipient.firstName} ${deletingRecipient.lastName}` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the recipient and any related match history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deletingRecipient && (
              <form
                action={deleteCorrectionsRecipient}
                onSubmit={() => {
                  setDeletingRecipient(null)
                }}
              >
                <input type="hidden" name="recipientId" value={deletingRecipient.id} />
                <FormSubmitButton variant="destructive" pendingText="Deleting...">
                  Delete Recipient
                </FormSubmitButton>
              </form>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Create a new corrections volunteer contact.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <form
              action={createCorrectionsContact}
              onSubmit={() => {
                setIsAddContactOpen(false)
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-contact-firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-contact-lastName" name="lastName" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-gender">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select value={newContactGender} onValueChange={setNewContactGender}>
                    <SelectTrigger id="new-contact-gender" className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECTIONS_GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="gender" value={newContactGender} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-birthYear">
                    Birth Year <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-contact-birthYear"
                    name="birthYear"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    placeholder="YYYY"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-contact-streetAddress">Street Address</Label>
                <Input id="new-contact-streetAddress" name="streetAddress" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-contact-city" name="city" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-county">County</Label>
                  <Input id="new-contact-county" name="county" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-state">State</Label>
                  <Input id="new-contact-state" name="state" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-zipCode">ZIP</Label>
                  <Input id="new-contact-zipCode" name="zipCode" inputMode="numeric" pattern="\\d{5}(-\\d{4})?" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-contact-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input id="new-contact-email" name="email" type="email" required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-sobrietyDate">
                    Sobriety Date <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-contact-sobrietyDate" name="sobrietyDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-homeGroup">Home Group</Label>
                  <Input id="new-contact-homeGroup" name="homeGroup" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-phonePrimary">Phone 1</Label>
                  <Input id="new-contact-phonePrimary" name="phonePrimary" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-phoneSecondary">Phone 2</Label>
                  <Input id="new-contact-phoneSecondary" name="phoneSecondary" type="tel" />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="new-contact-isSpanishSpeaking"
                    checked={newContactSpanish}
                    onCheckedChange={(checked) => setNewContactSpanish(checked === true)}
                  />
                  <Label htmlFor="new-contact-isSpanishSpeaking" className="font-normal cursor-pointer">
                    Spanish-speaking
                  </Label>
                  <input type="hidden" name="isSpanishSpeaking" value={newContactSpanish ? "true" : "false"} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-contact-otherLanguages">Other Languages Spoken</Label>
                  <Input id="new-contact-otherLanguages" name="otherLanguages" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-contact-notes">Notes</Label>
                <Textarea id="new-contact-notes" name="notes" />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="new-contact-active" className="font-normal cursor-pointer">
                    Active contact
                  </Label>
                  <Switch id="new-contact-active" checked={newContactActive} onCheckedChange={setNewContactActive} />
                </div>
                <input type="hidden" name="active" value={newContactActive ? "true" : "false"} />
              </div>

              <DialogFooter className="mt-2">
                <FormSubmitButton pendingText="Saving...">Create Contact</FormSubmitButton>
              </DialogFooter>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingContact}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null)
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information in a modal workflow.</DialogDescription>
          </DialogHeader>

          {editingContact && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <form
                action={updateCorrectionsContact}
                onSubmit={() => setEditingContact(null)}
                className="space-y-4"
              >
                <input type="hidden" name="id" value={editingContact.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-firstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="edit-contact-firstName" name="firstName" defaultValue={editingContact.firstName} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-lastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="edit-contact-lastName" name="lastName" defaultValue={editingContact.lastName} required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-gender">
                      Gender <span className="text-destructive">*</span>
                    </Label>
                    <Select value={editContactGender} onValueChange={setEditContactGender}>
                      <SelectTrigger id="edit-contact-gender" className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {CORRECTIONS_GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="gender" value={editContactGender} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-birthYear">
                      Birth Year <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-contact-birthYear"
                      name="birthYear"
                      defaultValue={editingContact.birthYear ? String(editingContact.birthYear) : ""}
                      inputMode="numeric"
                      pattern="\\d{4}"
                      maxLength={4}
                      placeholder="YYYY"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-contact-streetAddress">Street Address</Label>
                  <Input id="edit-contact-streetAddress" name="streetAddress" defaultValue={editingContact.streetAddress ?? ""} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-city">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input id="edit-contact-city" name="city" defaultValue={editingContact.city} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-county">County</Label>
                    <Input id="edit-contact-county" name="county" defaultValue={editingContact.county ?? ""} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-state">State</Label>
                    <Input id="edit-contact-state" name="state" defaultValue={editingContact.state ?? ""} maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-zipCode">ZIP</Label>
                    <Input
                      id="edit-contact-zipCode"
                      name="zipCode"
                      defaultValue={editingContact.zipCode ?? ""}
                      inputMode="numeric"
                      pattern="\\d{5}(-\\d{4})?"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-contact-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input id="edit-contact-email" name="email" type="email" defaultValue={editingContact.email ?? ""} required />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-sobrietyDate">
                      Sobriety Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-contact-sobrietyDate"
                      name="sobrietyDate"
                      type="date"
                      defaultValue={editingContact.sobrietyDate ?? ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-homeGroup">Home Group</Label>
                    <Input id="edit-contact-homeGroup" name="homeGroup" defaultValue={editingContact.homeGroup ?? ""} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-phonePrimary">Phone 1</Label>
                    <Input id="edit-contact-phonePrimary" name="phonePrimary" type="tel" defaultValue={editingContact.phonePrimary ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-phoneSecondary">Phone 2</Label>
                    <Input
                      id="edit-contact-phoneSecondary"
                      name="phoneSecondary"
                      type="tel"
                      defaultValue={editingContact.phoneSecondary ?? ""}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="edit-contact-isSpanishSpeaking"
                      checked={editContactSpanish}
                      onCheckedChange={(checked) => setEditContactSpanish(checked === true)}
                    />
                    <Label htmlFor="edit-contact-isSpanishSpeaking" className="font-normal cursor-pointer">
                      Spanish-speaking
                    </Label>
                    <input type="hidden" name="isSpanishSpeaking" value={editContactSpanish ? "true" : "false"} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-otherLanguages">Other Languages Spoken</Label>
                    <Input
                      id="edit-contact-otherLanguages"
                      name="otherLanguages"
                      defaultValue={editingContact.otherLanguages ?? ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-contact-notes">Notes</Label>
                  <Textarea id="edit-contact-notes" name="notes" defaultValue={editingContact.notes ?? ""} />
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="edit-contact-active" className="font-normal cursor-pointer">
                      Active contact
                    </Label>
                    <Switch id="edit-contact-active" checked={editContactActive} onCheckedChange={setEditContactActive} />
                  </div>
                  <input type="hidden" name="active" value={editContactActive ? "true" : "false"} />
                </div>

                <DialogFooter className="mt-2">
                  <FormSubmitButton pendingText="Saving...">Save Contact</FormSubmitButton>
                </DialogFooter>
              </form>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Add Recipient</DialogTitle>
            <DialogDescription>Create a new recipient record from a modal form.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <form
              action={createCorrectionsRecipient}
              onSubmit={() => setIsAddRecipientOpen(false)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-recipient-firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-recipient-lastName" name="lastName" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-idNumber">
                    ID Number <span className="text-destructive">*</span>
                  </Label>
                  <Input id="new-recipient-idNumber" name="idNumber" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-gender">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select value={newRecipientGender} onValueChange={setNewRecipientGender}>
                    <SelectTrigger id="new-recipient-gender" className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECTIONS_GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="gender" value={newRecipientGender} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-birthYear">Birth Year</Label>
                  <Input
                    id="new-recipient-birthYear"
                    name="birthYear"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    placeholder="YYYY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-dischargeDate">Discharge Date</Label>
                  <Input id="new-recipient-dischargeDate" name="dischargeDate" type="date" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facility <span className="text-destructive">*</span></Label>
                  <Select value={newRecipientFacility} onValueChange={setNewRecipientFacility}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="facilityName" value={newRecipientFacility} />
                </div>
                <div className="space-y-2">
                  <Label>Source <span className="text-destructive">*</span></Label>
                  <Select value={newRecipientSource} onValueChange={setNewRecipientSource}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="source" value={newRecipientSource} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-phone">Phone</Label>
                  <Input id="new-recipient-phone" name="phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-contactEmail">Contact Email</Label>
                  <Input id="new-recipient-contactEmail" name="contactEmail" type="email" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-recipient-releaseAddress">Release Address</Label>
                <Input id="new-recipient-releaseAddress" name="releaseAddress" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-releaseCity">Release City</Label>
                  <Input id="new-recipient-releaseCity" name="releaseCity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-releaseCounty">Release County</Label>
                  <Input id="new-recipient-releaseCounty" name="releaseCounty" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-releaseState">Release State</Label>
                  <Input id="new-recipient-releaseState" name="releaseState" defaultValue="MN" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient-releaseZip">Release ZIP</Label>
                  <Input id="new-recipient-releaseZip" name="releaseZip" inputMode="numeric" pattern="\\d{5}(-\\d{4})?" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newRecipientStatus} onValueChange={setNewRecipientStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="status" value={newRecipientStatus} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-recipient-notes">Notes</Label>
                <Textarea id="new-recipient-notes" name="notes" />
              </div>

              <DialogFooter className="mt-2">
                <FormSubmitButton pendingText="Saving...">Create Recipient</FormSubmitButton>
              </DialogFooter>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingRecipient}
        onOpenChange={(open) => {
          if (!open) setEditingRecipient(null)
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Recipient</DialogTitle>
            <DialogDescription>Manage recipient details through the modal editor.</DialogDescription>
          </DialogHeader>

          {editingRecipient && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <form
                action={updateCorrectionsRecipient}
                onSubmit={() => setEditingRecipient(null)}
                className="space-y-4"
              >
                <input type="hidden" name="id" value={editingRecipient.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-firstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="edit-recipient-firstName" name="firstName" defaultValue={editingRecipient.firstName} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-lastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="edit-recipient-lastName" name="lastName" defaultValue={editingRecipient.lastName} required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-idNumber">
                      ID Number <span className="text-destructive">*</span>
                    </Label>
                    <Input id="edit-recipient-idNumber" name="idNumber" defaultValue={editingRecipient.idNumber} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-gender">
                      Gender <span className="text-destructive">*</span>
                    </Label>
                    <Select value={editRecipientGender} onValueChange={setEditRecipientGender}>
                      <SelectTrigger id="edit-recipient-gender" className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {CORRECTIONS_GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="gender" value={editRecipientGender} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-birthYear">Birth Year</Label>
                    <Input
                      id="edit-recipient-birthYear"
                      name="birthYear"
                      defaultValue={editingRecipient.birthYear ? String(editingRecipient.birthYear) : ""}
                      inputMode="numeric"
                      pattern="\\d{4}"
                      maxLength={4}
                      placeholder="YYYY"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-dischargeDate">Discharge Date</Label>
                    <Input
                      id="edit-recipient-dischargeDate"
                      name="dischargeDate"
                      type="date"
                      defaultValue={editingRecipient.dischargeDate ?? ""}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Facility <span className="text-destructive">*</span></Label>
                    <Select value={editRecipientFacility} onValueChange={setEditRecipientFacility}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="facilityName" value={editRecipientFacility} />
                  </div>
                  <div className="space-y-2">
                    <Label>Source <span className="text-destructive">*</span></Label>
                    <Select value={editRecipientSource} onValueChange={setEditRecipientSource}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="source" value={editRecipientSource} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-phone">Phone</Label>
                    <Input id="edit-recipient-phone" name="phone" type="tel" defaultValue={editingRecipient.phone ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-contactEmail">Contact Email</Label>
                    <Input
                      id="edit-recipient-contactEmail"
                      name="contactEmail"
                      type="email"
                      defaultValue={editingRecipient.contactEmail ?? ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-recipient-releaseAddress">Release Address</Label>
                  <Input
                    id="edit-recipient-releaseAddress"
                    name="releaseAddress"
                    defaultValue={editingRecipient.releaseAddress ?? ""}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-releaseCity">Release City</Label>
                    <Input
                      id="edit-recipient-releaseCity"
                      name="releaseCity"
                      defaultValue={editingRecipient.releaseCity ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-releaseCounty">Release County</Label>
                    <Input
                      id="edit-recipient-releaseCounty"
                      name="releaseCounty"
                      defaultValue={editingRecipient.releaseCounty ?? ""}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-releaseState">Release State</Label>
                    <Input
                      id="edit-recipient-releaseState"
                      name="releaseState"
                      defaultValue={editingRecipient.releaseState ?? ""}
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipient-releaseZip">Release ZIP</Label>
                    <Input
                      id="edit-recipient-releaseZip"
                      name="releaseZip"
                      defaultValue={editingRecipient.releaseZip ?? ""}
                      inputMode="numeric"
                      pattern="\\d{5}(-\\d{4})?"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editRecipientStatus} onValueChange={setEditRecipientStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPIENT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="status" value={editRecipientStatus} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-recipient-notes">Notes</Label>
                  <Textarea id="edit-recipient-notes" name="notes" defaultValue={editingRecipient.notes ?? ""} />
                </div>

                <DialogFooter className="mt-2">
                  <FormSubmitButton pendingText="Saving...">Save Recipient</FormSubmitButton>
                </DialogFooter>
              </form>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusRecipient}
        onOpenChange={(open) => {
          if (!open) setStatusRecipient(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Update Status{statusRecipient ? `: ${statusRecipient.firstName} ${statusRecipient.lastName}` : ""}
            </DialogTitle>
            <DialogDescription>Use modal status actions for consistency across admin workflows.</DialogDescription>
          </DialogHeader>

          {statusRecipient && (
            <div className="space-y-3">
              <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                <div>ID {statusRecipient.idNumber}</div>
                <div>Current status: {statusRecipient.status}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {statusRecipient.status !== "completed" && (
                  <form
                    action={markRecipientCompleted}
                    onSubmit={() => {
                      setStatusRecipient(null)
                    }}
                  >
                    <input type="hidden" name="recipientId" value={statusRecipient.id} />
                    <FormSubmitButton pendingText="Updating...">Mark Completed</FormSubmitButton>
                  </form>
                )}

                {statusRecipient.status !== "unmatched" && (
                  <form
                    action={markRecipientUnmatched}
                    onSubmit={() => {
                      setStatusRecipient(null)
                    }}
                  >
                    <input type="hidden" name="recipientId" value={statusRecipient.id} />
                    <FormSubmitButton variant="outline" pendingText="Updating...">
                      Set Unmatched
                    </FormSubmitButton>
                  </form>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!matchingRecipient}
        onOpenChange={(open) => {
          if (!open) setMatchingRecipient(null)
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Find Match{matchingRecipient ? `: ${matchingRecipient.firstName} ${matchingRecipient.lastName}` : ""}
            </DialogTitle>
            <DialogDescription>
              Suggestions are ranked by ZIP, city/state, county/state, and state overlap.
            </DialogDescription>
          </DialogHeader>

          {matchingRecipient && (
            <div className="space-y-3">
              <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">
                  Target: {matchingRecipient.firstName} {matchingRecipient.lastName}
                </div>
                <div>
                  Location: {matchingRecipient.releaseCity || "Unknown city"}
                  {matchingRecipient.releaseState ? `, ${matchingRecipient.releaseState}` : ""}
                  {matchingRecipient.releaseZip ? ` ${matchingRecipient.releaseZip}` : ""}
                </div>
                <div>
                  Birth Year: {matchingRecipient.birthYear ?? "-"} • Discharge: {matchingRecipient.dischargeDate || "-"}
                </div>
              </div>

              {matchCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active contacts are currently available.</p>
              ) : (
                <ScrollArea className="h-[460px] pr-2">
                  <div className="space-y-2">
                    {matchCandidates.map((candidate) => (
                      <div key={candidate.contact.id} className="rounded-md border border-border p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">
                              {candidate.contact.firstName} {candidate.contact.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.contact.city}
                              {candidate.contact.state ? `, ${candidate.contact.state}` : ""}
                              {candidate.contact.zipCode ? ` ${candidate.contact.zipCode}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Birth Year: {candidate.contact.birthYear ?? "-"} • Sobriety: {candidate.contact.sobrietyDate || "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Score {candidate.score} • {candidate.reasons.join(", ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.contact.email ?? "No email"}
                              {candidate.contact.phonePrimary ? ` • ${candidate.contact.phonePrimary}` : ""}
                            </p>
                          </div>
                          {canEdit && (
                            <form
                              action={matchRecipientToContact}
                              onSubmit={() => {
                                setMatchingRecipient(null)
                              }}
                            >
                              <input type="hidden" name="recipientId" value={matchingRecipient.id} />
                              <input type="hidden" name="contactId" value={candidate.contact.id} />
                              <FormSubmitButton size="sm" pendingText="Matching...">
                                Match Contact
                              </FormSubmitButton>
                            </form>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
