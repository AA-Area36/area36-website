"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FileText, Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, Search, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Newsletter data with years for filtering
const newsletters = [
  {
    id: "2026-01",
    title: "The Pigeon",
    issue: "January 2026",
    year: 2026,
    month: 1,
    description: "Happy New Year from Area 36! Updates on the upcoming Spring Assembly and Delegate report.",
    highlights: ["Spring Assembly Preview", "Delegate Report", "New Year Message"],
  },
  {
    id: "2025-12",
    title: "The Pigeon",
    issue: "December 2025",
    year: 2025,
    month: 12,
    description: "Annual meeting recap, holiday gratitude, and service opportunities in the new year.",
    highlights: ["Annual Meeting Recap", "Holiday Gratitude", "Service Opportunities"],
  },
  {
    id: "2025-11",
    title: "The Pigeon",
    issue: "November 2025",
    year: 2025,
    month: 11,
    description: "Area Inventory highlights, Gratitude Month, and committee updates.",
    highlights: ["Area Inventory", "Gratitude Month", "Committee Updates"],
  },
  {
    id: "2025-10",
    title: "The Pigeon",
    issue: "October 2025",
    year: 2025,
    month: 10,
    description: "Budget Assembly summary, joint corrections workshop, and upcoming events.",
    highlights: ["Budget Assembly", "Corrections Workshop", "Upcoming Events"],
  },
  {
    id: "2025-09",
    title: "The Pigeon",
    issue: "September 2025",
    year: 2025,
    month: 9,
    description: "West Central Regional Forum recap and Area Assembly preview.",
    highlights: ["Regional Forum Recap", "Assembly Preview"],
  },
  {
    id: "2025-08",
    title: "The Pigeon",
    issue: "August 2025",
    year: 2025,
    month: 8,
    description: "Summer service activities and upcoming Regional Forum information.",
    highlights: ["Summer Activities", "Regional Forum Info"],
  },
  {
    id: "2025-07",
    title: "The Pigeon",
    issue: "July 2025",
    year: 2025,
    month: 7,
    description: "Independence in sobriety, Founders Day celebrations, and committee reports.",
    highlights: ["Founders Day", "Committee Reports"],
  },
  {
    id: "2025-06",
    title: "The Pigeon",
    issue: "June 2025",
    year: 2025,
    month: 6,
    description: "75th General Service Conference highlights and Delegate report preview.",
    highlights: ["GSC Highlights", "Delegate Report Preview"],
  },
  {
    id: "2025-05",
    title: "The Pigeon",
    issue: "May 2025",
    year: 2025,
    month: 5,
    description: "Spring Assembly highlights and committee chair elections.",
    highlights: ["Spring Assembly", "Elections"],
  },
  {
    id: "2025-04",
    title: "The Pigeon",
    issue: "April 2025",
    year: 2025,
    month: 4,
    description: "General Service Conference preview and district spotlight.",
    highlights: ["GSC Preview", "District Spotlight"],
  },
  {
    id: "2025-03",
    title: "The Pigeon",
    issue: "March 2025",
    year: 2025,
    month: 3,
    description: "Area Committee Meeting summary and Spring Assembly preview.",
    highlights: ["ACM Summary", "Spring Assembly Preview"],
  },
  {
    id: "2025-02",
    title: "The Pigeon",
    issue: "February 2025",
    year: 2025,
    month: 2,
    description: "Founders Day planning and service position descriptions.",
    highlights: ["Founders Day Planning", "Service Positions"],
  },
  {
    id: "2025-01",
    title: "The Pigeon",
    issue: "January 2025",
    year: 2025,
    month: 1,
    description: "New year message from the Delegate and committee goals for 2025.",
    highlights: ["Delegate Message", "2025 Goals"],
  },
  {
    id: "2024-12",
    title: "The Pigeon",
    issue: "December 2024",
    year: 2024,
    month: 12,
    description: "Year in review and holiday gratitude message.",
    highlights: ["Year in Review", "Holiday Message"],
  },
  {
    id: "2024-11",
    title: "The Pigeon",
    issue: "November 2024",
    year: 2024,
    month: 11,
    description: "Fall Assembly recap and Thanksgiving traditions in recovery.",
    highlights: ["Fall Assembly Recap", "Thanksgiving Traditions"],
  },
  {
    id: "2024-10",
    title: "The Pigeon",
    issue: "October 2024",
    year: 2024,
    month: 10,
    description: "Budget Assembly and elections summary.",
    highlights: ["Budget Assembly", "Elections Summary"],
  },
]

// Get unique years from newsletters
const years = [...new Set(newsletters.map((n) => n.year))].sort((a, b) => b - a)

export default function NewsletterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial values from URL
  const initialId = searchParams.get("id") || newsletters[0].id
  const initialSearch = searchParams.get("q") || ""
  const initialYear = searchParams.get("year") || "all"

  const [selectedId, setSelectedId] = React.useState(initialId)
  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [yearFilter, setYearFilter] = React.useState(initialYear)
  const [zoom, setZoom] = React.useState(100)

  // Update URL when filters change
  const updateURL = React.useCallback((id: string, search: string, year: string) => {
    const params = new URLSearchParams()
    if (id && id !== newsletters[0].id) params.set("id", id)
    if (search) params.set("q", search)
    if (year && year !== "all") params.set("year", year)

    const queryString = params.toString()
    router.replace(queryString ? `?${queryString}` : "/newsletter", { scroll: false })
  }, [router])

  // Filter newsletters
  const filteredNewsletters = React.useMemo(() => {
    return newsletters.filter((newsletter) => {
      const matchesSearch = searchQuery === "" ||
        newsletter.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        newsletter.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        newsletter.highlights.some(h => h.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesYear = yearFilter === "all" || newsletter.year === parseInt(yearFilter)

      return matchesSearch && matchesYear
    })
  }, [searchQuery, yearFilter])

  // Get selected newsletter
  const selectedNewsletter = newsletters.find((n) => n.id === selectedId) || newsletters[0]

  // Handle newsletter selection
  const handleSelectNewsletter = (id: string) => {
    setSelectedId(id)
    updateURL(id, searchQuery, yearFilter)
  }

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateURL(selectedId, value, yearFilter)
  }

  // Handle year filter change
  const handleYearChange = (value: string) => {
    setYearFilter(value)
    updateURL(selectedId, searchQuery, value)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("")
    setYearFilter("all")
    updateURL(selectedId, "", "all")
  }

  const hasActiveFilters = searchQuery !== "" || yearFilter !== "all"

  // Navigate to adjacent newsletters
  const currentIndex = filteredNewsletters.findIndex((n) => n.id === selectedId)
  const canGoNewer = currentIndex > 0
  const canGoOlder = currentIndex < filteredNewsletters.length - 1 && currentIndex !== -1

  const goNewer = () => {
    if (canGoNewer) {
      const newId = filteredNewsletters[currentIndex - 1].id
      handleSelectNewsletter(newId)
    }
  }

  const goOlder = () => {
    if (canGoOlder) {
      const newId = filteredNewsletters[currentIndex + 1].id
      handleSelectNewsletter(newId)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-12 sm:py-16"
          aria-labelledby="newsletter-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="max-w-2xl">
                <h1 id="newsletter-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                  The Pigeon
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  The Pigeon is a General Service paper newsletter published four times a year by the Southern Minnesota
                  Area Assembly of Alcoholics Anonymous. An anonymized digital version is available on this website.
                </p>
                <p className="mt-4 text-sm text-muted-foreground italic">
                  The Pigeon presents the experience and opinions of A.A. members and others interested in the A.A.
                  program. Opinions expressed herein are not to be attributed to Alcoholics Anonymous as a whole, nor
                  does publication of any article imply endorsement by either A.A. or the Southern MN Area Assembly.
                </p>
              </div>
              <div className="text-sm text-muted-foreground md:text-right">
                {newsletters.length} issues available
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Viewer */}
        <section className="py-8 sm:py-12" aria-label="Newsletter viewer">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
              {/* Newsletter List Panel */}
              <div className="lg:order-1 space-y-4">
                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="search"
                      placeholder="Search newsletters..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 h-9"
                      aria-label="Search newsletters"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={yearFilter} onValueChange={handleYearChange}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-muted-foreground">
                    {filteredNewsletters.length === newsletters.length
                      ? `${newsletters.length} newsletters`
                      : `${filteredNewsletters.length} of ${newsletters.length} newsletters`}
                  </div>
                </div>

                {/* Newsletter List */}
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="max-h-[500px] overflow-y-auto">
                    {filteredNewsletters.length === 0 ? (
                      <div className="p-8 text-center">
                        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No newsletters found</p>
                        <button
                          onClick={clearFilters}
                          className="text-sm text-primary hover:underline mt-2"
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      filteredNewsletters.map((newsletter, index) => {
                        const isSelected = selectedId === newsletter.id
                        return (
                          <button
                            key={newsletter.id}
                            onClick={() => handleSelectNewsletter(newsletter.id)}
                            className={cn(
                              "w-full text-left p-4 border-b border-border last:border-b-0 transition-colors",
                              isSelected
                                ? "bg-primary/10 border-l-4 border-l-primary"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                                  <span className="text-sm font-medium text-foreground">{newsletter.issue}</span>
                                  {index === 0 && !hasActiveFilters && (
                                    <Badge variant="secondary" className="text-xs">Latest</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{newsletter.description}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {newsletter.highlights.slice(0, 2).map((highlight) => (
                                    <span
                                      key={highlight}
                                      className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                    >
                                      {highlight}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <FileText className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )} />
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="lg:order-2">
                <div className="rounded-xl border border-border bg-card overflow-hidden sticky top-4">
                  {/* Viewer Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{selectedNewsletter.title} - {selectedNewsletter.issue}</h3>
                        <p className="text-xs text-muted-foreground truncate">{selectedNewsletter.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.max(50, zoom - 25))}
                        disabled={zoom <= 50}
                        aria-label="Zoom out"
                        className="h-8 w-8"
                      >
                        <ZoomOut className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.min(200, zoom + 25))}
                        disabled={zoom >= 200}
                        aria-label="Zoom in"
                        className="h-8 w-8"
                      >
                        <ZoomIn className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button variant="ghost" size="icon" aria-label="Full screen" className="h-8 w-8">
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="outline" size="sm" aria-label={`Download ${selectedNewsletter.issue}`}>
                        <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                    </div>
                  </div>

                  {/* PDF Content Area */}
                  <div
                    className="bg-muted/50 min-h-[600px] flex items-start justify-center overflow-auto p-4"
                  >
                    <div
                      className="bg-background shadow-lg w-full max-w-2xl min-h-[800px] rounded transition-transform"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                    >
                      {/* Simulated Newsletter Content */}
                      <div className="p-8 space-y-6">
                        <div className="text-center border-b border-border pb-6">
                          <h1 className="text-3xl font-bold text-primary">The Pigeon</h1>
                          <p className="text-lg text-muted-foreground mt-1">Area 36 Newsletter</p>
                          <p className="text-muted-foreground mt-2">{selectedNewsletter.issue}</p>
                        </div>

                        <div className="space-y-4">
                          <h2 className="text-lg font-semibold text-foreground">From the Chairperson</h2>
                          <p className="text-muted-foreground leading-relaxed">
                            Greetings, Area 36! As we continue our journey in service, I am reminded of the words from
                            our A.A. literature that tell us service is the heart of our program. This month has been
                            filled with opportunities to carry the message...
                          </p>
                        </div>

                        <div className="space-y-4">
                          <h2 className="text-lg font-semibold text-foreground">In This Issue</h2>
                          <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            {selectedNewsletter.highlights.map((highlight) => (
                              <li key={highlight}>{highlight}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h2 className="text-lg font-semibold text-foreground">Summary</h2>
                          <p className="text-muted-foreground leading-relaxed">{selectedNewsletter.description}</p>
                        </div>

                        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
                          <p className="font-semibold">Southern Minnesota Area 36 of Alcoholics Anonymous</p>
                          <p>P.O. Box 2812, Minneapolis, MN 55402</p>
                          <p className="mt-2">newsletter@area36.org</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Viewer Footer */}
                  <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goOlder}
                      disabled={!canGoOlder}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                      <span className="hidden sm:inline">Older</span>
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {currentIndex !== -1
                        ? `${currentIndex + 1} of ${filteredNewsletters.length}`
                        : "Not in filtered list"
                      }
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goNewer}
                      disabled={!canGoNewer}
                    >
                      <span className="hidden sm:inline">Newer</span>
                      <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscribe & Submit Section */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="subscribe-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Subscribe */}
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 id="subscribe-heading" className="text-xl font-bold text-foreground mb-4">
                  Subscribe to The Pigeon
                </h2>
                <p className="text-muted-foreground mb-4">
                  There is no subscription fee; contributions from A.A. members, groups, and districts are welcome.
                  Subscriptions are available, for free, in both snail mail and email format. The email version is
                  anonymized.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  To subscribe to either format, please email both addresses below:
                </p>
                <div className="space-y-2">
                  <a
                    href="mailto:grouprecords@area36.org"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    grouprecords@area36.org
                  </a>
                  <a
                    href="mailto:newsletter@area36.org"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    newsletter@area36.org
                  </a>
                </div>
              </div>

              {/* Submit */}
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Submit an Article
                </h2>
                <p className="text-muted-foreground mb-4">
                  Articles and letters are invited, although no payment can be made, nor can contributed material be
                  returned.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  All submissions may be emailed to the Newsletter Chair or sent via mail:
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:newsletter@area36.org"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    newsletter@area36.org
                  </a>
                  <address className="text-sm text-muted-foreground not-italic">
                    SMAA<br />
                    PO Box 2812<br />
                    Minneapolis, MN 55402
                  </address>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
