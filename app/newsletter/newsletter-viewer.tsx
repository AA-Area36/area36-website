"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  FileText,
  Calendar,
  Search,
  X,
  Filter,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PDFViewer } from "@/components/pdf-viewer"
import type { Newsletter } from "@/lib/gdrive/types"

interface NewsletterViewerProps {
  newsletters: Newsletter[]
  years: number[]
}

export function NewsletterViewer({ newsletters, years }: NewsletterViewerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const ITEMS_PER_PAGE = 10

  // Get initial values from URL
  const initialSearch = searchParams.get("q") || ""
  const initialYear = searchParams.get("year") || "all"
  const initialPage = parseInt(searchParams.get("page") || "1", 10)

  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [yearFilter, setYearFilter] = React.useState(initialYear)
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  const [selectedNewsletter, setSelectedNewsletter] = React.useState<Newsletter | null>(null)

  // Update URL when filters change
  const updateURL = React.useCallback(
    (search: string, year: string, page: number) => {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (year && year !== "all") params.set("year", year)
      if (page > 1) params.set("page", page.toString())

      const queryString = params.toString()
      router.replace(queryString ? `?${queryString}` : "/newsletter", { scroll: false })
    },
    [router]
  )

  // Filter newsletters
  const filteredNewsletters = React.useMemo(() => {
    return newsletters.filter((newsletter) => {
      const matchesSearch =
        searchQuery === "" ||
        newsletter.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        newsletter.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        newsletter.highlights.some((h) =>
          h.toLowerCase().includes(searchQuery.toLowerCase())
        )

      const matchesYear =
        yearFilter === "all" || newsletter.year === parseInt(yearFilter)

      return matchesSearch && matchesYear
    })
  }, [newsletters, searchQuery, yearFilter])

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page on search
    updateURL(value, yearFilter, 1)
  }

  // Handle year filter change
  const handleYearChange = (value: string) => {
    setYearFilter(value)
    setCurrentPage(1) // Reset to first page on filter change
    updateURL(searchQuery, value, 1)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("")
    setYearFilter("all")
    setCurrentPage(1)
    updateURL("", "all", 1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateURL(searchQuery, yearFilter, page)
  }

  const hasActiveFilters = searchQuery !== "" || yearFilter !== "all"

  // Pagination calculations
  const totalPages = Math.ceil(filteredNewsletters.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedNewsletters = filteredNewsletters.slice(startIndex, endIndex)

  // Reset to page 1 if current page is out of bounds after filtering
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
      updateURL(searchQuery, yearFilter, 1)
    }
  }, [totalPages, currentPage, searchQuery, yearFilter, updateURL])

  // PDF viewer navigation
  const currentIndex = selectedNewsletter
    ? filteredNewsletters.findIndex((n) => n.id === selectedNewsletter.id)
    : -1
  const canGoNewer = currentIndex > 0
  const canGoOlder = currentIndex < filteredNewsletters.length - 1 && currentIndex !== -1

  const goNewer = () => {
    if (canGoNewer) {
      setSelectedNewsletter(filteredNewsletters[currentIndex - 1])
    }
  }

  const goOlder = () => {
    if (canGoOlder) {
      setSelectedNewsletter(filteredNewsletters[currentIndex + 1])
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search newsletters..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search newsletters"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={yearFilter} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[140px]">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-primary"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredNewsletters.length === newsletters.length
          ? `${newsletters.length} newsletters`
          : `${filteredNewsletters.length} of ${newsletters.length} newsletters`}
      </div>

      {/* Newsletter List */}
      {filteredNewsletters.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No newsletters found</p>
          <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="mt-4 text-primary"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedNewsletters.map((newsletter, index) => {
              // Calculate actual index in full list for "Latest" badge
              const actualIndex = startIndex + index
              return (
                <div
                  key={newsletter.id}
                  className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {newsletter.issue}
                      </h3>
                      {actualIndex === 0 && !hasActiveFilters && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {newsletter.description}
                    </p>
                    {newsletter.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newsletter.highlights.slice(0, 3).map((highlight) => (
                          <span
                            key={highlight}
                            className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {newsletter.year}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedNewsletter(newsletter)}
                      aria-label={`View ${newsletter.issue}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {newsletter.downloadUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        aria-label={`Download ${newsletter.issue}`}
                      >
                        <a
                          href={newsletter.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* PDF Viewer Modal */}
      {selectedNewsletter && (
        <PDFViewer
          previewUrl={selectedNewsletter.previewUrl}
          title={`${selectedNewsletter.title} - ${selectedNewsletter.issue}`}
          subtitle={selectedNewsletter.description}
          downloadUrl={selectedNewsletter.downloadUrl}
          onClose={() => setSelectedNewsletter(null)}
          onPrevious={goNewer}
          onNext={goOlder}
          canGoPrevious={canGoNewer}
          canGoNext={canGoOlder}
          currentIndex={currentIndex !== -1 ? currentIndex : undefined}
          totalCount={filteredNewsletters.length}
          previousLabel="Newer"
          nextLabel="Older"
        />
      )}
    </div>
  )
}
