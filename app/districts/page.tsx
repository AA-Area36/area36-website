"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail, MapPin, Users, Search, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const districts = [
  {
    number: 1,
    name: "District 1",
    dcm: "dcm1@area36.org",
    counties: ["Blue Earth", "Faribault", "Martin", "Watonwan"],
    cities: ["Mankato", "Blue Earth", "Fairmont", "St. James"],
    meetings: 45,
    color: "#3b82f6",
  },
  {
    number: 2,
    name: "District 2",
    dcm: "dcm2@area36.org",
    counties: ["Le Sueur", "Nicollet", "Sibley"],
    cities: ["St. Peter", "Le Sueur", "Gaylord", "Henderson"],
    meetings: 28,
    color: "#10b981",
  },
  {
    number: 3,
    name: "District 3",
    dcm: "dcm3@area36.org",
    counties: ["Rice", "Steele", "Waseca"],
    cities: ["Faribault", "Owatonna", "Waseca", "Northfield"],
    meetings: 52,
    color: "#f59e0b",
  },
  {
    number: 4,
    name: "District 4",
    dcm: "dcm4@area36.org",
    counties: ["Freeborn", "Mower"],
    cities: ["Albert Lea", "Austin"],
    meetings: 35,
    color: "#ef4444",
  },
  {
    number: 5,
    name: "District 5",
    dcm: "dcm5@area36.org",
    counties: ["Dodge", "Olmsted"],
    cities: ["Rochester", "Kasson", "Byron"],
    meetings: 68,
    color: "#8b5cf6",
  },
  {
    number: 6,
    name: "District 6",
    dcm: "dcm6@area36.org",
    counties: ["Fillmore", "Houston", "Winona"],
    cities: ["Winona", "La Crescent", "Spring Grove", "Preston"],
    meetings: 42,
    color: "#06b6d4",
  },
  {
    number: 7,
    name: "District 7",
    dcm: "dcm7@area36.org",
    counties: ["Goodhue", "Wabasha"],
    cities: ["Red Wing", "Lake City", "Wabasha", "Zumbrota"],
    meetings: 38,
    color: "#ec4899",
  },
  {
    number: 8,
    name: "District 8",
    dcm: "dcm8@area36.org",
    counties: ["Scott"],
    cities: ["Shakopee", "Prior Lake", "Savage", "Jordan"],
    meetings: 55,
    color: "#14b8a6",
  },
  {
    number: 9,
    name: "District 9",
    dcm: "dcm9@area36.org",
    counties: ["Dakota (South)"],
    cities: ["Lakeville", "Apple Valley", "Burnsville", "Eagan"],
    meetings: 72,
    color: "#f97316",
  },
  {
    number: 10,
    name: "District 10",
    dcm: "dcm10@area36.org",
    counties: ["Dakota (North)"],
    cities: ["South St. Paul", "Inver Grove Heights", "West St. Paul", "Mendota Heights"],
    meetings: 48,
    color: "#6366f1",
  },
  {
    number: 11,
    name: "District 11",
    dcm: "dcm11@area36.org",
    counties: ["Hennepin (South)"],
    cities: ["Bloomington", "Eden Prairie", "Edina", "Richfield"],
    meetings: 85,
    color: "#84cc16",
  },
  {
    number: 12,
    name: "District 12",
    dcm: "dcm12@area36.org",
    counties: ["Minneapolis (South)"],
    cities: ["Minneapolis (South)"],
    meetings: 95,
    color: "#a855f7",
  },
  {
    number: 13,
    name: "District 13",
    dcm: "dcm13@area36.org",
    counties: ["Minneapolis (Central)"],
    cities: ["Minneapolis (Central/Downtown)"],
    meetings: 110,
    color: "#0ea5e9",
  },
  {
    number: 15,
    name: "District 15",
    dcm: "dcm15@area36.org",
    counties: ["Hennepin (Southwest)"],
    cities: ["Hopkins", "St. Louis Park", "Minnetonka", "Wayzata"],
    meetings: 78,
    color: "#22c55e",
  },
  {
    number: 16,
    name: "District 16",
    dcm: "dcm16@area36.org",
    counties: ["Carver"],
    cities: ["Chaska", "Chanhassen", "Waconia", "Norwood Young America"],
    meetings: 32,
    color: "#eab308",
  },
]

export default function DistrictsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedDistrict, setSelectedDistrict] = React.useState<(typeof districts)[0] | null>(null)

  const filteredDistricts = districts.filter((district) => {
    const query = searchQuery.toLowerCase()
    return (
      district.name.toLowerCase().includes(query) ||
      district.counties.some((c) => c.toLowerCase().includes(query)) ||
      district.cities.some((c) => c.toLowerCase().includes(query))
    )
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="districts-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 id="districts-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              Districts
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Area 36 is divided into districts, each representing a geographic region of southern Minnesota. Districts
              are the link between individual A.A. groups and the Area.
            </p>
          </div>
        </section>

        {/* District Map and List */}
        <section className="py-12 sm:py-16" aria-label="District map and information">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Search */}
            <div className="mb-8 max-w-md">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Search by district, county, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  aria-label="Search districts"
                />
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Interactive Map */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Area 36 District Map</h2>
                <div className="aspect-[4/3] rounded-lg bg-muted/50 relative overflow-hidden">
                  {/* SVG Map of Southern Minnesota */}
                  <svg viewBox="0 0 800 600" className="w-full h-full" aria-label="Interactive district map">
                    {/* Background */}
                    <rect width="800" height="600" fill="currentColor" className="text-muted/30" />

                    {/* Simplified district regions */}
                    {districts.map((district, index) => {
                      const col = index % 5
                      const row = Math.floor(index / 5)
                      const x = 50 + col * 140
                      const y = 50 + row * 150
                      const isSelected = selectedDistrict?.number === district.number

                      return (
                        <g key={district.number}>
                          <rect
                            x={x}
                            y={y}
                            width={120}
                            height={120}
                            rx={8}
                            fill={district.color}
                            fillOpacity={isSelected ? 0.8 : 0.4}
                            stroke={isSelected ? district.color : "transparent"}
                            strokeWidth={3}
                            className="cursor-pointer transition-all hover:fill-opacity-60"
                            onClick={() => setSelectedDistrict(district)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select ${district.name}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedDistrict(district)
                              }
                            }}
                          />
                          <text
                            x={x + 60}
                            y={y + 50}
                            textAnchor="middle"
                            className="fill-foreground text-sm font-semibold pointer-events-none"
                          >
                            D{district.number}
                          </text>
                          <text
                            x={x + 60}
                            y={y + 70}
                            textAnchor="middle"
                            className="fill-muted-foreground text-xs pointer-events-none"
                          >
                            {district.meetings} meetings
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 p-2 rounded">
                    Click a district for details
                  </div>
                </div>

                {/* Selected District Details */}
                {selectedDistrict && (
                  <div className="mt-6 p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedDistrict.color }} />
                      <h3 className="font-semibold text-foreground">{selectedDistrict.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Counties:</span>{" "}
                        {selectedDistrict.counties.join(", ")}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Major Cities:</span>{" "}
                        {selectedDistrict.cities.join(", ")}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Active Meetings:</span>{" "}
                        {selectedDistrict.meetings}
                      </p>
                      <Link
                        href={`mailto:${selectedDistrict.dcm}`}
                        className="inline-flex items-center gap-2 text-primary hover:underline mt-2"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Contact DCM: {selectedDistrict.dcm}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* District List */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">All Districts</h2>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredDistricts.map((district) => (
                    <Card
                      key={district.number}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${selectedDistrict?.number === district.number ? "border-primary ring-2 ring-primary/20" : ""}`}
                      onClick={() => setSelectedDistrict(district)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: district.color }} />
                            <CardTitle className="text-base">{district.name}</CardTitle>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                            {district.meetings} meetings
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <span>{district.counties.join(", ")}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <Link
                            href={`mailto:${district.dcm}`}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {district.dcm}
                          </Link>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is a District */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="about-districts-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 id="about-districts-heading" className="text-2xl font-bold text-foreground mb-4">
                What is a District?
              </h2>
              <div className="prose prose-muted dark:prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  A district is a geographical unit within the A.A. General Service structure that includes a number of
                  groups. Districts are the vital link between individual groups and the Area, helping to ensure that
                  information flows both ways.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Each district is led by a District Committee Member (DCM), who is elected by the General Service
                  Representatives (GSRs) of the groups within the district. The DCM coordinates district activities,
                  represents the district at Area meetings, and helps GSRs carry out their responsibilities.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  District meetings are held regularly and are open to all A.A. members. These meetings provide
                  opportunities for GSRs to share experience, discuss district business, and plan local service
                  activities.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/service"
                  className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                >
                  Learn more about service structure →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
