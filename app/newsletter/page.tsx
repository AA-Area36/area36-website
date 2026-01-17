"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FileText, Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const newsletters = [
  {
    id: 1,
    title: "January 2026 Newsletter",
    date: "January 2026",
    description: "Happy New Year from Area 36! Updates on the upcoming Spring Assembly and Delegate report.",
  },
  {
    id: 2,
    title: "December 2025 Newsletter",
    date: "December 2025",
    description: "Annual meeting recap, holiday gratitude, and service opportunities in the new year.",
  },
  {
    id: 3,
    title: "November 2025 Newsletter",
    date: "November 2025",
    description: "Area Inventory highlights, Gratitude Month, and committee updates.",
  },
  {
    id: 4,
    title: "October 2025 Newsletter",
    date: "October 2025",
    description: "Budget Assembly summary, joint corrections workshop, and upcoming events.",
  },
  {
    id: 5,
    title: "September 2025 Newsletter",
    date: "September 2025",
    description: "West Central Regional Forum recap and Area Assembly preview.",
  },
  {
    id: 6,
    title: "August 2025 Newsletter",
    date: "August 2025",
    description: "Summer service activities and upcoming Regional Forum information.",
  },
  {
    id: 7,
    title: "July 2025 Newsletter",
    date: "July 2025",
    description: "Independence in sobriety, Founders Day celebrations, and committee reports.",
  },
  {
    id: 8,
    title: "June 2025 Newsletter",
    date: "June 2025",
    description: "75th General Service Conference highlights and Delegate report preview.",
  },
]

export default function NewsletterPage() {
  const [selectedNewsletter, setSelectedNewsletter] = React.useState(newsletters[0])
  const [zoom, setZoom] = React.useState(100)

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
            <h1 id="newsletter-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              Newsletter
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Stay informed with the Area 36 newsletter. Read online or download past issues.
            </p>
          </div>
        </section>

        {/* Newsletter Viewer */}
        <section className="py-8 sm:py-12" aria-label="Newsletter viewer">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
              {/* Newsletter List */}
              <div className="lg:order-1">
                <h2 className="text-lg font-semibold text-foreground mb-4">All Newsletters</h2>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {newsletters.map((newsletter) => (
                      <Card
                        key={newsletter.id}
                        className={`cursor-pointer transition-all hover:border-primary/50 ${selectedNewsletter.id === newsletter.id ? "border-primary ring-2 ring-primary/20" : ""}`}
                        onClick={() => setSelectedNewsletter(newsletter)}
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {newsletter.date}
                          </div>
                          <CardTitle className="text-sm">{newsletter.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <p className="text-xs text-muted-foreground line-clamp-2">{newsletter.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* PDF Viewer */}
              <div className="lg:order-2">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Viewer Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedNewsletter.title}</h3>
                        <p className="text-xs text-muted-foreground">{selectedNewsletter.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.max(50, zoom - 25))}
                        disabled={zoom <= 50}
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.min(200, zoom + 25))}
                        disabled={zoom >= 200}
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <div className="w-px h-6 bg-border mx-2" />
                      <Button variant="ghost" size="icon" aria-label="Full screen">
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="outline" size="sm" aria-label={`Download ${selectedNewsletter.title}`}>
                        <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* PDF Content Area */}
                  <div
                    className="bg-muted/50 min-h-[600px] flex items-center justify-center overflow-auto"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                  >
                    <div className="bg-background shadow-lg m-8 p-8 max-w-2xl w-full min-h-[800px] rounded">
                      {/* Simulated Newsletter Content */}
                      <div className="space-y-6">
                        <div className="text-center border-b border-border pb-6">
                          <h1 className="text-2xl font-bold text-primary">Area 36 Newsletter</h1>
                          <p className="text-muted-foreground mt-2">{selectedNewsletter.date}</p>
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
                          <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
                          <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Area Assembly - Check events page for details</li>
                            <li>Committee Meetings - Monthly schedule available</li>
                            <li>Regional Forum - Save the date!</li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h2 className="text-lg font-semibold text-foreground">Committee Reports</h2>
                          <p className="text-muted-foreground leading-relaxed">{selectedNewsletter.description}</p>
                        </div>

                        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
                          <p>Southern Minnesota Area 36 of Alcoholics Anonymous</p>
                          <p>P.O. Box 2812, Minneapolis, MN 55402</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Viewer Footer */}
                  <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentIndex = newsletters.findIndex((n) => n.id === selectedNewsletter.id)
                        if (currentIndex < newsletters.length - 1) {
                          setSelectedNewsletter(newsletters[currentIndex + 1])
                        }
                      }}
                      disabled={newsletters.findIndex((n) => n.id === selectedNewsletter.id) === newsletters.length - 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                      Older Issue
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Issue {newsletters.findIndex((n) => n.id === selectedNewsletter.id) + 1} of {newsletters.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentIndex = newsletters.findIndex((n) => n.id === selectedNewsletter.id)
                        if (currentIndex > 0) {
                          setSelectedNewsletter(newsletters[currentIndex - 1])
                        }
                      }}
                      disabled={newsletters.findIndex((n) => n.id === selectedNewsletter.id) === 0}
                    >
                      Newer Issue
                      <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                    </Button>
                  </div>
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
