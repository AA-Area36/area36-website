"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CONTENT_SCHEMAS, SUPPORTED_LOCALE_LABELS, type ContentDoc, type Scope } from "@/lib/content/schema"
import { getAtPath, setAtPath } from "@/lib/content/t"
import type { Locale } from "@/lib/i18n/locales"
import { publishContent, saveContentDraft } from "./actions"

type LocaleState = {
  doc: ContentDoc
  publishedDoc: ContentDoc | null
  draftUpdatedAt: string | null
  publishedAt: string | null
  updatedBy: string | null
}

export function ContentEditor({
  scope,
  initialByLocale,
}: {
  scope: Scope
  initialByLocale: Record<Locale, LocaleState>
}) {
  const schema = CONTENT_SCHEMAS[scope]
  const [activeLocale, setActiveLocale] = React.useState<Locale>("en")
  const [byLocale, setByLocale] = React.useState<Record<Locale, LocaleState>>(initialByLocale)
  const [pendingLocale, startTransition] = React.useTransition()
  const [jsonText, setJsonText] = React.useState<Record<string, string>>({})
  const [jsonError, setJsonError] = React.useState<Record<string, string>>({})

  const defaultsEn = schema.defaultsEn

  function updateField(locale: Locale, path: string, value: string) {
    setByLocale((prev) => {
      const next = { ...prev }
      next[locale] = { ...next[locale], doc: setAtPath(next[locale].doc, path, value) }
      return next
    })
  }

  function resetLocaleToDefaults(locale: Locale) {
    setByLocale((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], doc: locale === "en" ? structuredClone(defaultsEn) : {} },
    }))
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
      setByLocale((prev) => {
        const next = { ...prev }
        next[locale] = { ...next[locale], doc: setAtPath(next[locale].doc, path, parsed) }
        return next
      })
    } catch (e) {
      setJsonError((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : "Invalid JSON" }))
    }
  }

  function formatJsonField(locale: Locale, path: string) {
    const key = jsonKey(locale, path)
    const currentText = jsonText[key] ?? ""
    try {
      const parsed = JSON.parse(currentText) as unknown
      const formatted = JSON.stringify(parsed, null, 2)
      updateJsonField(locale, path, formatted)
    } catch {
      // Leave as-is if invalid.
    }
  }

  function copyMissingFromEnglish(locale: Locale) {
    if (locale === "en") return
    setByLocale((prev) => {
      const next = { ...prev }
      let doc = next[locale].doc
      for (const section of schema.sections) {
        for (const field of section.fields) {
          if (field.translatable === false) continue
          if (field.type === "json") continue
          const current = getAtPath(doc, field.path)
          if (typeof current === "string" && current.trim() !== "") continue
          const enVal = getAtPath(prev.en.doc, field.path)
          if (typeof enVal === "string") doc = setAtPath(doc, field.path, enVal)
        }
      }
      next[locale] = { ...next[locale], doc }
      return next
    })
  }

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

  async function save(locale: Locale) {
    const doc = byLocale[locale].doc
    startTransition(async () => {
      const hasJsonErr = Object.keys(jsonError).some((k) => k.startsWith(`${locale}:`))
      if (hasJsonErr) return
      const res = await saveContentDraft({ scope, locale, doc })
      if (!res.ok) return
      setByLocale((prev) => ({
        ...prev,
        [locale]: {
          ...prev[locale],
          draftUpdatedAt: new Date().toISOString(),
          updatedBy: "you",
        },
      }))
    })
  }

  async function publish(locale: Locale) {
    startTransition(async () => {
      const hasJsonErr = Object.keys(jsonError).some((k) => k.startsWith(`${locale}:`))
      if (hasJsonErr) return
      const res = await publishContent({ scope, locale })
      if (!res.ok) return
      setByLocale((prev) => ({
        ...prev,
        [locale]: {
          ...prev[locale],
          publishedDoc: structuredClone(prev[locale].doc),
          publishedAt: new Date().toISOString(),
          updatedBy: "you",
        },
      }))
    })
  }

  const locales = Object.keys(SUPPORTED_LOCALE_LABELS) as Locale[]

  return (
    <div className="grid gap-6">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.08]">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-foreground blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,.15)_1px,transparent_0)] [background-size:22px_22px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.14)_1px,transparent_0)]" />
        </div>
        <CardHeader className="relative">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">{schema.title} Content</CardTitle>
              <CardDescription>{schema.description}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[11px]">
                scope:{scope}
              </Badge>
              <Badge className={cn("text-[11px]", missingCount(activeLocale) === 0 ? "bg-emerald-600" : "bg-amber-600")}>
                {missingCount(activeLocale) === 0 ? "Complete" : `${missingCount(activeLocale)} missing`}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as Locale)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="w-full lg:w-auto">
                {locales.map((loc) => (
                  <TabsTrigger key={loc} value={loc} className="gap-2">
                    <span className="font-medium">{SUPPORTED_LOCALE_LABELS[loc].nativeName}</span>
                    <span className="hidden sm:inline text-muted-foreground">({SUPPORTED_LOCALE_LABELS[loc].name})</span>
                    {missingCount(loc) > 0 ? (
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {missingCount(loc)}
                      </span>
                    ) : (
                      <span className="ml-1 rounded bg-emerald-600/15 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                        ok
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex flex-wrap items-center gap-2">
                {activeLocale !== "en" && (
                  <Button variant="outline" size="sm" onClick={() => copyMissingFromEnglish(activeLocale)} disabled={pendingLocale}>
                    Copy missing from English
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => resetLocaleToDefaults(activeLocale)} disabled={pendingLocale}>
                  Reset
                </Button>
                <Button variant="secondary" size="sm" onClick={() => save(activeLocale)} disabled={pendingLocale}>
                  Save draft
                </Button>
                <Button size="sm" onClick={() => publish(activeLocale)} disabled={pendingLocale}>
                  Publish
                </Button>
              </div>
            </div>

            {locales.map((loc) => (
              <TabsContent key={loc} value={loc} className="mt-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <ScrollArea className="rounded-lg border border-border bg-background">
                    <div className="p-4">
                      <div className="space-y-8">
                        {schema.sections.map((section) => (
                          <section key={section.id} className="space-y-4">
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <h3 className="text-sm font-semibold tracking-tight text-foreground">{section.title}</h3>
                                {section.description && (
                                  <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                                )}
                              </div>
                              {loc !== "en" && (
                                <Badge variant="outline" className="text-[11px]">
                                  English shown as reference
                                </Badge>
                              )}
                            </div>

                            <div className="grid gap-4">
                              {section.fields.map((field) => {
                                const current = getAtPath(byLocale[loc].doc, field.path)
                                const currentStr = typeof current === "string" ? current : ""
                                const isTranslatable = field.translatable !== false
                                const en = getAtPath(byLocale.en.doc, field.path)
                                const enStr = typeof en === "string" ? en : ""
                                const enJson = field.type === "json" ? JSON.stringify(en ?? null, null, 2) : ""

                                const key = jsonKey(loc, field.path)
                                const currentJsonText =
                                  jsonText[key] ??
                                  (field.type === "json" ? JSON.stringify(current ?? null, null, 2) : "")
                                const currentJsonErr = jsonError[key]

                                return (
                                  <div key={field.path} className="grid gap-2">
                                    <div className="flex items-baseline justify-between gap-4">
                                      <Label className="text-sm">{field.label}</Label>
                                      <span
                                        className={cn(
                                          "text-[11px] font-mono",
                                          field.type === "json"
                                            ? current != null
                                              ? "text-muted-foreground"
                                              : "text-amber-600 dark:text-amber-400"
                                            : currentStr.trim()
                                              ? "text-muted-foreground"
                                              : "text-amber-600 dark:text-amber-400",
                                        )}
                                      >
                                        {loc !== "en" && !isTranslatable
                                          ? "inherited"
                                          : field.type === "json"
                                            ? current != null
                                              ? "set"
                                              : "missing"
                                            : currentStr.trim()
                                              ? "set"
                                              : "missing"}
                                      </span>
                                    </div>

                                    {field.type === "json" ? (
                                      <div className="grid gap-2">
                                        <Textarea
                                          value={loc !== "en" && !isTranslatable ? enJson : currentJsonText}
                                          rows={field.rows ?? 18}
                                          onChange={(e) => updateJsonField(loc, field.path, e.target.value)}
                                          className="font-mono text-xs"
                                          disabled={loc !== "en" && !isTranslatable}
                                        />
                                        {currentJsonErr && !(loc !== "en" && !isTranslatable) && (
                                          <p className="text-xs text-destructive">Invalid JSON: {currentJsonErr}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => formatJsonField(loc, field.path)}
                                            disabled={pendingLocale || (loc !== "en" && !isTranslatable)}
                                          >
                                            Format JSON
                                          </Button>
                                          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
                                        </div>
                                        {loc !== "en" && !isTranslatable && (
                                          <p className="text-xs text-muted-foreground">
                                            This field inherits from English (edit it on the English tab).
                                          </p>
                                        )}
                                      </div>
                                    ) : field.type === "textarea" ? (
                                      <Textarea
                                        value={currentStr}
                                        rows={field.rows ?? 4}
                                        onChange={(e) => updateField(loc, field.path, e.target.value)}
                                        placeholder={loc === "en" ? "" : enStr}
                                        disabled={loc !== "en" && !isTranslatable}
                                      />
                                    ) : (
                                      <Input
                                        value={currentStr}
                                        onChange={(e) => updateField(loc, field.path, e.target.value)}
                                        placeholder={loc === "en" ? "" : enStr}
                                        disabled={loc !== "en" && !isTranslatable}
                                      />
                                    )}

                                    {loc !== "en" && enStr && isTranslatable && (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-mono">en:</span> {enStr}
                                      </p>
                                    )}
                                    {field.help && field.type !== "json" && (
                                      <p className="text-xs text-muted-foreground">{field.help}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Status</CardTitle>
                      <CardDescription>Draft and publish timestamps for this locale.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Missing fields</span>
                        <span className="font-mono">{missingCount(loc)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Draft updated</span>
                        <span className="font-mono text-xs">{byLocale[loc].draftUpdatedAt ?? "n/a"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Published</span>
                        <span className="font-mono text-xs">{byLocale[loc].publishedAt ?? "n/a"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Updated by</span>
                        <span className="font-mono text-xs">{byLocale[loc].updatedBy ?? "n/a"}</span>
                      </div>
                      <div className="pt-2 text-xs text-muted-foreground">
                        Public pages use published content immediately. Missing translations fall back to English.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
