"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, MapPin, Search, ExternalLink, ChevronDown, Calendar } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import type { ContentDoc } from "@/lib/content/schema"
import { createTranslator, formatTemplate, getAtPath } from "@/lib/content/t"
import type { DistrictDirectoryEntry } from "@/lib/constants/district-directory"

function isDistrictDirectory(value: unknown): value is DistrictDirectoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every((d) => d && typeof d === "object" && typeof (d as any).number === "number" && typeof (d as any).name === "string")
  )
}

export function DistrictsClient({ content }: { content: ContentDoc }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = createTranslator(content)
  const learnMoreHrefRaw = t("page.about.learnMoreHref", "/service-basics")
  const learnMoreHref = learnMoreHrefRaw === "/service" ? "/service-basics" : learnMoreHrefRaw

  const directoryRaw = getAtPath(content, "directory")
  const districts: DistrictDirectoryEntry[] = isDistrictDirectory(directoryRaw) ? directoryRaw : []

  // Get initial values from URL
  const initialSearch = searchParams.get("q") || ""
  const initialDistrict = searchParams.get("district") ? parseInt(searchParams.get("district")!, 10) : null

  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [expandedDistrict, setExpandedDistrict] = React.useState<number | null>(initialDistrict)

  // Update URL when filters change
  const updateURL = React.useCallback(
    (search: string, district: number | null) => {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (district) params.set("district", district.toString())

      const queryString = params.toString()
      router.replace(queryString ? `?${queryString}` : "/districts", { scroll: false })
    },
    [router],
  )

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateURL(value, expandedDistrict)
  }

  const filteredDistricts = districts.filter((district) => {
    const query = searchQuery.toLowerCase()
    return (
      district.name.toLowerCase().includes(query) ||
      district.counties.some((c) => c.toLowerCase().includes(query)) ||
      district.cities?.some((c) => c.toLowerCase().includes(query)) ||
      district.dcmName?.toLowerCase().includes(query) ||
      district.description?.toLowerCase().includes(query)
    )
  })

  const toggleDistrict = (number: number) => {
    const newDistrict = expandedDistrict === number ? null : number
    setExpandedDistrict(newDistrict)
    updateURL(searchQuery, newDistrict)
  }

  const allTitle = formatTemplate(t("page.allTitle", "All Districts ({count})"), { count: districts.length })

  return (
    <>
      <PageHeader
        title={t("page.title", "Districts")}
        description={t(
          "page.intro",
          "Area 36 is divided into 26 geographic districts plus District 27, a linguistic district for Spanish-speaking groups.\nDistricts are the link between individual A.A. groups and the Area.",
        )}
        ariaId="districts-heading"
      />

      {/* Map Section - Full Width */}
      <section className="py-8 sm:py-12" aria-label={t("page.map.sectionAriaLabel", "District map")}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="aspect-[21/9] sm:aspect-[3/1]">
              <iframe
                src={t("page.map.iframeSrc")}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={t("page.map.iframeTitle", "Area 36 District Map")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* District List Section */}
      <section className="py-8 sm:py-12" aria-label={t("page.map.sectionAriaLabelList", "District list")}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search and Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-foreground">{allTitle}</h2>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                placeholder={t("page.searchPlaceholder", "Search by district, county, city, or DCM...")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9"
                aria-label={t("page.searchAriaLabel", "Search districts")}
              />
            </div>
          </div>

          {/* District Cards */}
          <div className="space-y-3">
            {filteredDistricts.map((district) => {
              const isExpanded = expandedDistrict === district.number

              return (
                <div key={district.number} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Header - Always visible */}
                  <button
                    onClick={() => toggleDistrict(district.number)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-foreground">{district.name}</span>
                      {district.unrepresented && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                          {t("page.badges.open", "DCM Position Open")}
                        </Badge>
                      )}
                      {district.linguistic && (
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        >
                          {t("page.badges.spanish", "Spanish Speaking")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {district.counties.slice(0, 2).join(", ")}
                        {district.counties.length > 2 &&
                          " " +
                            formatTemplate(t("page.labels.countiesMore", "+{count} more"), {
                              count: district.counties.length - 2,
                            })}
                      </span>
                      <ChevronDown
                        className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                      />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-border">
                      <div className="pt-6 grid gap-6 md:grid-cols-2">
                        {/* Left Column - Info */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("page.labels.location", "Location")}</h4>
                            <p className="text-foreground">{district.counties.join(", ")}</p>
                            {district.cities && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {t("page.labels.citiesPrefix", "Cities:")} {district.cities.join(", ")}
                              </p>
                            )}
                            {district.description && <p className="text-sm text-muted-foreground mt-1">{district.description}</p>}
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("page.labels.dcm", "DCM")}</h4>
                            {district.dcmName ? (
                              <p className="text-foreground">{district.dcmName}</p>
                            ) : (
                              <p className="text-muted-foreground italic">{t("page.labels.positionOpen", "Position currently open")}</p>
                            )}
                          </div>

                          {(district.meetingDay || district.meetingLocation) && (
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                                {t("page.labels.districtMeeting", "District Meeting")}
                              </h4>
                              {district.meetingDay && (
                                <div className="flex items-center gap-2 text-foreground">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {district.meetingDay}
                                    {district.meetingTime && ` ${t("page.labels.at", "at")} ${district.meetingTime}`}
                                  </span>
                                </div>
                              )}
                              {district.meetingLocation && (
                                <div className="flex items-start gap-2 text-foreground mt-1">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p>{district.meetingLocation}</p>
                                    {district.meetingAddress && <p className="text-sm text-muted-foreground">{district.meetingAddress}</p>}
                                  </div>
                                </div>
                              )}
                              {district.meetingNote && (
                                <p className="text-sm text-muted-foreground mt-2 italic">{district.meetingNote}</p>
                              )}
                            </div>
                          )}

                          {district.note && <p className="text-sm text-muted-foreground italic">{district.note}</p>}
                        </div>

                        {/* Right Column - Actions */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">{t("page.labels.actions", "Actions")}</h4>

                          {district.dcmEmail && (
                            <Button asChild variant="outline" className="w-full justify-start">
                              <Link href={`mailto:${district.dcmEmail}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                {t("page.actions.emailDcm", "Email DCM")}
                              </Link>
                            </Button>
                          )}

                          {district.website && (
                            <Button asChild variant="outline" className="w-full justify-start">
                              <Link href={`https://${district.website}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t("page.actions.visitWebsite", "Visit District Website")}
                              </Link>
                            </Button>
                          )}

                          {district.meetingAddress && (
                            <Button asChild variant="outline" className="w-full justify-start">
                              <Link
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(district.meetingAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MapPin className="mr-2 h-4 w-4" />
                                {t("page.actions.directions", "Get Directions")}
                              </Link>
                            </Button>
                          )}

                          {!district.dcmEmail && !district.website && !district.meetingAddress && (
                            <p className="text-sm text-muted-foreground">{t("page.actions.noActions")}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredDistricts.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-border bg-card">
                <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  {formatTemplate(t("page.empty.noResults", 'No districts found matching "{query}"'), { query: searchQuery })}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What is a District */}
      <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="about-districts-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 id="about-districts-heading" className="text-2xl font-bold text-foreground mb-4">
              {t("page.about.title", "What is a District?")}
            </h2>
            <div className="prose prose-muted dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">{t("page.about.p1")}</p>
              <p className="text-muted-foreground leading-relaxed mt-4">{t("page.about.p2")}</p>
              <p className="text-muted-foreground leading-relaxed mt-4">{t("page.about.p3")}</p>
            </div>
            <div className="mt-6">
              <Link href={learnMoreHref} className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
                {t("page.about.learnMore", "Learn more about service structure")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
