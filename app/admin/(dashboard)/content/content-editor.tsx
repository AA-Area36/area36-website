"use client"

import * as React from "react"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Copy,
  Eye,
  ExternalLink,
  Info,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react"
import {
  CONTENT_SCHEMAS,
  SUPPORTED_LOCALE_LABELS,
  type ContentDoc,
  type ContentSection,
  type Scope,
} from "@/lib/content/schema"
import { getAtPath, setAtPath } from "@/lib/content/t"
import type { Locale } from "@/lib/i18n/locales"
import { publishContent, saveContentDraft, setContentPreviewEnabled } from "./actions"

/* ---------------------------------- Types --------------------------------- */

type LocaleState = {
  doc: ContentDoc
  publishedDoc: ContentDoc | null
  draftUpdatedAt: string | null
  publishedAt: string | null
  updatedBy: string | null
}

/* --------------------------------- Helpers -------------------------------- */

function safeJsonParse(value: string | null | undefined): ContentDoc | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as ContentDoc
    return null
  } catch {
    return null
  }
}

const DEFAULT_PREVIEW_PATH_BY_SCOPE: Partial<Record<Scope, string>> = {
  home: "/",
  districts: "/districts",
  about: "/about",
  committees: "/committees",
  contact: "/contact",
  contribute: "/contribute",
  correctionsTcp: "/corrections-temporary-contact-program",
  events: "/events",
  generalServiceConference: "/general-service-conference",
  grapevine: "/grapevine",
  newsletter: "/newsletter",
  professionals: "/professionals",
  recordings: "/recordings",
  reports: "/reports",
  resources: "/resources",
  serviceBasics: "/service-basics",
  temporaryContactPrograms: "/temporary-contact-programs",
  treatmentTcp: "/treatment-temporary-contact-program",
  ypaa: "/ypaa",
}

function getDefaultPreviewPath(scope: Scope): string {
  return DEFAULT_PREVIEW_PATH_BY_SCOPE[scope] ?? "/"
}

/* ============================== Main Editor =============================== */

export function ContentEditor({
  scope,
  initialByLocale,
  initialPreviewEnabled,
}: {
  scope: Scope
  initialByLocale: Record<Locale, LocaleState>
  initialPreviewEnabled: boolean
}) {
  const schema = CONTENT_SCHEMAS[scope]
  const locales = Object.keys(SUPPORTED_LOCALE_LABELS) as Locale[]

  /* ------------------------------ Core state ------------------------------ */
  const [activeLocale, setActiveLocale] = React.useState<Locale>("en")
  const [byLocale, setByLocale] = React.useState<Record<Locale, LocaleState>>(initialByLocale)
  const [pending, startTransition] = React.useTransition()
  const [jsonText, setJsonText] = React.useState<Record<string, string>>({})
  const [jsonError, setJsonError] = React.useState<Record<string, string>>({})

  /* ----------------------------- Preview state ----------------------------- */
  const [previewEnabled, setPreviewEnabled] = React.useState(initialPreviewEnabled)
  const [previewPath, setPreviewPath] = React.useState(() => getDefaultPreviewPath(scope))
  const [previewNonce, setPreviewNonce] = React.useState(0)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  /* ----------------------------- Dirty tracking ---------------------------- */
  const [savedSnapshot, setSavedSnapshot] = React.useState<Record<Locale, string>>(() =>
    Object.fromEntries(locales.map((loc) => [loc, JSON.stringify(initialByLocale[loc].doc)])) as Record<Locale, string>,
  )
  const isDirty = React.useMemo(
    () => JSON.stringify(byLocale[activeLocale].doc) !== savedSnapshot[activeLocale],
    [byLocale, activeLocale, savedSnapshot],
  )

  const defaultsEn = schema.defaultsEn

  /* ----------------------------- Field helpers ----------------------------- */

  function updateField(locale: Locale, path: string, value: string) {
    setByLocale((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], doc: setAtPath(prev[locale].doc, path, value) },
    }))
  }

  function resetLocaleToDefaults(locale: Locale) {
    setByLocale((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], doc: locale === "en" ? structuredClone(defaultsEn) : {} },
    }))
    toast.info(`Reset ${SUPPORTED_LOCALE_LABELS[locale].nativeName} to defaults`)
  }

  function jsonKey(locale: Locale, path: string) {
    return `${locale}:${path}`
  }

  function updateJsonField(locale: Locale, path: string, value: string) {
    const key = jsonKey(locale, path)
    setJsonText((prev) => ({ ...prev, [key]: value }))
    try {
      const parsed = JSON.parse(value) as unknown
      setJsonError((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setByLocale((prev) => ({
        ...prev,
        [locale]: { ...prev[locale], doc: setAtPath(prev[locale].doc, path, parsed) },
      }))
    } catch (e) {
      setJsonError((prev) => ({
        ...prev,
        [key]: e instanceof Error ? e.message : "Invalid JSON",
      }))
    }
  }

  function formatJsonField(locale: Locale, path: string) {
    const key = jsonKey(locale, path)
    const currentText = jsonText[key] ?? ""
    try {
      const parsed = JSON.parse(currentText) as unknown
      updateJsonField(locale, path, JSON.stringify(parsed, null, 2))
    } catch {
      /* leave as-is */
    }
  }

  function copyMissingFromEnglish(locale: Locale) {
    if (locale === "en") return
    setByLocale((prev) => {
      const next = { ...prev }
      let doc = next[locale].doc
      let copied = 0
      for (const section of schema.sections) {
        for (const field of section.fields) {
          if (field.translatable === false) continue
          if (field.type === "json") continue
          const current = getAtPath(doc, field.path)
          if (typeof current === "string" && current.trim() !== "") continue
          const enVal = getAtPath(prev.en.doc, field.path)
          if (typeof enVal === "string") {
            doc = setAtPath(doc, field.path, enVal)
            copied++
          }
        }
      }
      next[locale] = { ...next[locale], doc }
      toast.info(`Copied ${copied} field${copied === 1 ? "" : "s"} from English`)
      return next
    })
  }

  /* ----------------------------- Count helpers ----------------------------- */

  function missingCount(locale: Locale): number {
    let missing = 0
    const doc = byLocale[locale].doc
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (locale !== "en" && field.translatable === false) continue
        const v = getAtPath(doc, field.path)
        if (field.type === "json") {
          if (v === undefined || v === null) missing++
          continue
        }
        if (typeof v !== "string" || v.trim() === "") missing++
      }
    }
    return missing
  }

  function sectionMissingCount(section: ContentSection, locale: Locale): number {
    let missing = 0
    const doc = byLocale[locale].doc
    for (const field of section.fields) {
      if (locale !== "en" && field.translatable === false) continue
      const v = getAtPath(doc, field.path)
      if (field.type === "json") {
        if (v === undefined || v === null) missing++
        continue
      }
      if (typeof v !== "string" || v.trim() === "") missing++
    }
    return missing
  }

  /* ----------------------------- Save / Publish ----------------------------- */

  const saveRef = React.useRef(save)
  saveRef.current = save
  const publishRef = React.useRef(publish)
  publishRef.current = publish

  async function save(locale: Locale) {
    const doc = byLocale[locale].doc
    startTransition(async () => {
      const hasJsonErr = Object.keys(jsonError).some((k) => k.startsWith(`${locale}:`))
      if (hasJsonErr) {
        toast.error("Fix JSON errors before saving")
        return
      }
      const res = await saveContentDraft({ scope, locale, doc })
      if (!res.ok) {
        toast.error(res.error ?? "Failed to save draft")
        return
      }
      setByLocale((prev) => ({
        ...prev,
        [locale]: {
          ...prev[locale],
          draftUpdatedAt: res.draftUpdatedAt,
          updatedBy: res.updatedBy,
        },
      }))
      setSavedSnapshot((prev) => ({ ...prev, [locale]: JSON.stringify(doc) }))
      toast.success(`Draft saved for ${SUPPORTED_LOCALE_LABELS[locale].nativeName}`)
      if (previewEnabled) setPreviewNonce((n) => n + 1)
    })
  }

  async function publish(locale: Locale) {
    startTransition(async () => {
      const hasJsonErr = Object.keys(jsonError).some((k) => k.startsWith(`${locale}:`))
      if (hasJsonErr) {
        toast.error("Fix JSON errors before publishing")
        return
      }
      const res = await publishContent({ scope, locale })
      if (!res.ok) {
        toast.error(res.error ?? "Failed to publish")
        return
      }
      setByLocale((prev) => ({
        ...prev,
        [locale]: {
          ...prev[locale],
          publishedDoc: safeJsonParse(res.publishedJson) ?? structuredClone(prev[locale].doc),
          publishedAt: res.publishedAt,
          updatedBy: res.updatedBy,
        },
      }))
      toast.success(`Published ${SUPPORTED_LOCALE_LABELS[locale].nativeName} content`)
      if (previewEnabled) setPreviewNonce((n) => n + 1)
    })
  }

  /* ------------------------------ Preview --------------------------------- */

  function normalizePreviewPath(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return "/"
    if (!trimmed.startsWith("/")) return `/${trimmed}`
    return trimmed
  }

  async function togglePreview(nextEnabled: boolean) {
    startTransition(async () => {
      const res = await setContentPreviewEnabled(nextEnabled)
      if (!res.ok) {
        toast.error(res.error ?? "Failed to update preview setting")
        return
      }
      setPreviewEnabled(nextEnabled)
      setPreviewNonce((n) => n + 1)
    })
  }

  const previewSrc = React.useMemo(() => {
    const p = normalizePreviewPath(previewPath)
    const join = p.includes("?") ? "&" : "?"
    return `${p}${join}__contentPreview=${previewNonce}`
  }, [previewPath, previewNonce])

  /* ----------------------------- Keyboard shortcuts ----------------------- */

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        saveRef.current(activeLocale)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault()
        publishRef.current(activeLocale)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeLocale])

  /* ----------------------------- Section scroll --------------------------- */

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  /* ================================ Render ================================ */

  return (
    <div className="space-y-4">
      {/* ======================== Sticky Toolbar ========================= */}
      <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8 border-b border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Locale selector + status */}
          <div className="flex items-center gap-3">
            {/* Locale pills */}
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
              {locales.map((loc) => {
                const missing = missingCount(loc)
                const isActive = loc === activeLocale
                return (
                  <button
                    key={loc}
                    onClick={() => setActiveLocale(loc)}
                    className={cn(
                      "relative rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {loc.toUpperCase()}
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-0.5 size-2 rounded-full border border-background",
                        missing === 0 ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                  </button>
                )
              })}
            </div>

            {/* Status popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-7 px-2">
                  <Info className="size-3.5" />
                  <span className="hidden sm:inline">Status</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-3">
                <div className="space-y-3 text-sm">
                  <div className="font-medium">
                    {SUPPORTED_LOCALE_LABELS[activeLocale].nativeName} ({activeLocale})
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Missing fields</span>
                      <span className="font-mono">{missingCount(activeLocale)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Draft saved</span>
                      <span className="font-mono truncate max-w-[140px]">
                        {byLocale[activeLocale]?.draftUpdatedAt ?? "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Published</span>
                      <span className="font-mono truncate max-w-[140px]">
                        {byLocale[activeLocale]?.publishedAt ?? "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Updated by</span>
                      <span className="font-mono truncate max-w-[140px]">
                        {byLocale[activeLocale]?.updatedBy ?? "---"}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      Missing translations fall back to English. Published content goes live immediately.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Missing count badge */}
            {missingCount(activeLocale) > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 hidden sm:inline-flex">
                {missingCount(activeLocale)} missing
              </Badge>
            )}

            {/* Dirty indicator */}
            {isDirty && (
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            {/* Copy from EN (non-EN only, hidden on mobile) */}
            {activeLocale !== "en" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyMissingFromEnglish(activeLocale)}
                disabled={pending}
                className="hidden sm:inline-flex gap-1.5 text-xs h-8"
              >
                <Copy className="size-3.5" />
                Copy from EN
              </Button>
            )}

            {/* Overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeLocale !== "en" && (
                  <DropdownMenuItem
                    onClick={() => copyMissingFromEnglish(activeLocale)}
                    disabled={pending}
                    className="sm:hidden"
                  >
                    <Copy className="size-4" />
                    Copy missing from English
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => resetLocaleToDefaults(activeLocale)}
                  disabled={pending}
                >
                  <RotateCcw className="size-4" />
                  Reset to defaults
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono">Cmd+S</span> save &middot; <span className="font-mono">Cmd+Shift+P</span> publish
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save draft */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => save(activeLocale)}
              disabled={pending}
              className="gap-1.5 h-8"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span className="hidden sm:inline">Save draft</span>
              <span className="sm:hidden">Save</span>
              {isDirty && <span className="size-1.5 rounded-full bg-amber-400" />}
            </Button>

            {/* Publish */}
            <Button
              size="sm"
              onClick={() => publish(activeLocale)}
              disabled={pending}
              className="gap-1.5 h-8"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Publish
            </Button>

            {/* Preview trigger */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Eye className="size-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
              </DialogTrigger>
              <DialogContent
                className="fixed inset-y-0 right-0 left-auto h-screen w-screen sm:w-[min(1400px,100vw)] !max-w-none sm:!max-w-none translate-x-0 translate-y-0 top-0 rounded-l-xl rounded-r-none data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300 flex flex-col gap-0 p-0"
                style={{ width: "min(1400px, 100vw)", maxWidth: "none" }}
              >
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                  <DialogTitle className="text-base">Page Preview</DialogTitle>
                  <DialogDescription className="text-xs">
                    Preview saved drafts on the actual site layout.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 px-5 py-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={previewEnabled}
                      onCheckedChange={togglePreview}
                      disabled={pending}
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      {previewEnabled ? "Draft mode" : "Published mode"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={previewPath}
                      onChange={(e) => setPreviewPath(e.target.value)}
                      className="flex-1 h-8 text-sm font-mono"
                      placeholder={getDefaultPreviewPath(scope)}
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPreviewNonce((n) => n + 1)}
                      className="size-8 shrink-0"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                    <Button variant="outline" size="icon-sm" asChild className="size-8 shrink-0">
                      <Link
                        href={normalizePreviewPath(previewPath)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden border-t border-border">
                  {previewOpen && (
                    <iframe
                      key={previewSrc}
                      src={previewSrc}
                      className="h-full w-full bg-background"
                      title="Content preview"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ==================== Section Nav + Field Editor =================== */}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
        {/* Section nav sidebar (lg+) */}
        <nav className="hidden lg:block sticky top-32 self-start space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Sections
          </div>
          {schema.sections.map((section) => {
            const missing = sectionMissingCount(section, activeLocale)
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
              >
                <span className="truncate">{section.title}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums ml-2",
                    missing > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/50",
                  )}
                >
                  {section.fields.length - missing}/{section.fields.length}
                </span>
              </button>
            )
          })}

          {activeLocale !== "en" && (
            <div className="mt-4 rounded-md bg-muted/50 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                English values shown as reference below each field.
              </p>
            </div>
          )}
        </nav>

        {/* Mobile section nav (horizontal pills) */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 lg:hidden -mx-4 px-4 sm:-mx-6 sm:px-6">
          {schema.sections.map((section) => {
            const missing = sectionMissingCount(section, activeLocale)
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {section.title}
                {missing > 0 && (
                  <span className="size-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* Field sections */}
        <div>
          <Accordion
            type="multiple"
            defaultValue={schema.sections.map((s) => s.id)}
            className="space-y-3"
          >
            {schema.sections.map((section) => {
              const missing = sectionMissingCount(section, activeLocale)
              const total = section.fields.length

              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  id={`section-${section.id}`}
                  className="rounded-lg border border-border bg-card overflow-hidden scroll-mt-28"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{section.title}</span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {total - missing}/{total}
                      </span>
                      {missing > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                        >
                          {missing} missing
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5">
                    {section.description && (
                      <p className="mb-4 text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    )}
                    <div className="grid gap-5">
                      {section.fields.map((field) => {
                        const loc = activeLocale
                        const current = getAtPath(byLocale[loc].doc, field.path)
                        const currentStr = typeof current === "string" ? current : ""
                        const isTranslatable = field.translatable !== false
                        const en = getAtPath(byLocale.en.doc, field.path)
                        const enStr = typeof en === "string" ? en : ""
                        const enJson =
                          field.type === "json"
                            ? JSON.stringify(en ?? null, null, 2)
                            : ""

                        const jKey = jsonKey(loc, field.path)
                        const currentJsonText =
                          jsonText[jKey] ??
                          (field.type === "json"
                            ? JSON.stringify(current ?? null, null, 2)
                            : "")
                        const currentJsonErr = jsonError[jKey]

                        // Status
                        const isSet =
                          field.type === "json"
                            ? current != null
                            : currentStr.trim() !== ""
                        const statusLabel =
                          loc !== "en" && !isTranslatable
                            ? "inherited"
                            : isSet
                              ? "set"
                              : "missing"
                        const isDisabled = loc !== "en" && !isTranslatable

                        return (
                          <div key={field.path} className="grid gap-1.5">
                            {/* Label + status */}
                            <div className="flex items-center justify-between gap-2">
                              <Label className="text-sm font-medium">{field.label}</Label>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-[11px] font-mono",
                                  isSet || statusLabel === "inherited"
                                    ? "text-muted-foreground"
                                    : "text-amber-600 dark:text-amber-400",
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    statusLabel === "inherited"
                                      ? "bg-muted-foreground/40"
                                      : isSet
                                        ? "bg-emerald-500"
                                        : "bg-amber-500",
                                  )}
                                />
                                {statusLabel}
                              </span>
                            </div>

                            {/* Field input */}
                            {field.type === "json" ? (
                              <div className="grid gap-2">
                                <Textarea
                                  value={isDisabled ? enJson : currentJsonText}
                                  rows={field.rows ?? 18}
                                  onChange={(e) =>
                                    updateJsonField(loc, field.path, e.target.value)
                                  }
                                  className="font-mono text-xs"
                                  disabled={isDisabled}
                                />
                                {currentJsonErr && !isDisabled && (
                                  <p className="text-xs text-destructive">
                                    Invalid JSON: {currentJsonErr}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => formatJsonField(loc, field.path)}
                                    disabled={pending || isDisabled}
                                    className="h-7 text-xs"
                                  >
                                    Format JSON
                                  </Button>
                                  {field.help && (
                                    <p className="text-xs text-muted-foreground">
                                      {field.help}
                                    </p>
                                  )}
                                </div>
                                {isDisabled && (
                                  <p className="text-xs text-muted-foreground">
                                    This field inherits from English (edit on the EN tab).
                                  </p>
                                )}
                              </div>
                            ) : field.type === "textarea" ? (
                              <Textarea
                                value={currentStr}
                                rows={field.rows ?? 4}
                                onChange={(e) =>
                                  updateField(loc, field.path, e.target.value)
                                }
                                placeholder={loc === "en" ? undefined : enStr || undefined}
                                disabled={isDisabled}
                              />
                            ) : (
                              <Input
                                value={currentStr}
                                onChange={(e) =>
                                  updateField(loc, field.path, e.target.value)
                                }
                                placeholder={loc === "en" ? undefined : enStr || undefined}
                                disabled={isDisabled}
                                className="h-9"
                              />
                            )}

                            {/* English reference (non-EN locales) */}
                            {loc !== "en" && enStr && isTranslatable && field.type !== "json" && (
                              <p className="text-xs text-muted-foreground pl-0.5">
                                <span className="font-mono text-[10px] text-muted-foreground/60 mr-1">
                                  EN
                                </span>
                                {enStr}
                              </p>
                            )}

                            {/* Help text */}
                            {field.help && field.type !== "json" && (
                              <p className="text-xs text-muted-foreground/80">{field.help}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </div>
    </div>
  )
}
