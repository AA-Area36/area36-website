"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail, MapPin, Search, Clock, ExternalLink, ChevronDown, Calendar } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const districts = [
  {
    number: 1,
    name: "District 1",
    dcmName: "Collin R.",
    dcmEmail: "dist1@area36.org",
    counties: ["Olmsted", "Wabasha", "Goodhue", "Dodge (East)"],
    website: "www.aadistrict1.org",
    meetingDay: "3rd Wednesday",
    meetingTime: "6:30 PM",
    meetingLocation: "Various Locations",
    meetingNote: "Contact DCM for location",
  },
  {
    number: 2,
    name: "District 2",
    dcmName: "Steve B.",
    dcmEmail: "dist2@area36.org",
    counties: ["Fillmore", "Houston", "Winona"],
    website: "www.aadistrict2.org",
    meetingDay: "3rd Thursday",
    meetingTime: "7:00 PM",
    meetingLocation: "Grace Presbyterian Church",
    meetingAddress: "222 E. Broadway Street, Winona, MN 55987",
  },
  {
    number: 3,
    name: "District 3",
    dcmName: "Lynn S.",
    dcmEmail: "dist3@area36.org",
    counties: ["Freeborn", "Mower", "Steele", "Waseca", "Dodge (West)"],
    meetingDay: "1st Saturday",
    meetingTime: null,
    meetingLocation: "West Hills Alano",
    meetingAddress: "605 Florence Avenue, Owatonna, MN",
    meetingNote: "2nd Saturday if Area 36 event on 1st Saturday",
  },
  {
    number: 4,
    name: "District 4",
    dcmName: null,
    dcmEmail: null,
    counties: ["Meeker", "Kandiyohi"],
    unrepresented: true,
  },
  {
    number: 5,
    name: "District 5",
    dcmName: "Mort M.",
    dcmEmail: "dist5@area36.org",
    counties: ["Swift", "Chippewa", "Big Stone", "Lac Qui Parle"],
    website: "mndist5aa.wixsite.com/mndist5aa",
  },
  {
    number: 6,
    name: "District 6",
    dcmName: null,
    dcmEmail: null,
    counties: ["Yellow Medicine", "Lincoln", "Lyon"],
    unrepresented: true,
  },
  {
    number: 7,
    name: "District 7",
    dcmName: "Jaime M.",
    dcmEmail: "dist7@area36.org",
    counties: ["Hennepin (Southwest)"],
    cities: ["Chanhassen", "Eden Prairie", "Edina"],
    description: "Southwest Hennepin County including communities on the south shore of Lake Minnetonka",
    meetingDay: "2nd Monday",
    meetingTime: "6:30 PM",
    meetingLocation: "Immanuel Lutheran Church (Hybrid)",
    meetingAddress: "16515 Luther Way, Eden Prairie, MN 55346",
  },
  {
    number: 8,
    name: "District 8",
    dcmName: "Lindsey D.",
    dcmEmail: "dist8@area36.org",
    counties: ["Ramsey"],
    cities: ["St. Paul", "Maplewood", "White Bear Lake", "New Brighton", "Roseville", "Arden Hills"],
    meetingDay: "3rd Wednesday",
    meetingTime: "7:00 PM",
    meetingLocation: "On Zoom",
    meetingNote: "Contact DCM for Zoom information",
  },
  {
    number: 9,
    name: "District 9",
    dcmName: "Bennett C.",
    dcmEmail: "dist9@area36.org",
    counties: ["Blue Earth", "Le Sueur"],
    cities: ["Mankato", "North Mankato"],
    meetingDay: "2nd Tuesday",
    meetingTime: "7:00 PM",
    meetingAddress: "1430 5th Avenue, Mankato, MN 56001",
  },
  {
    number: 11,
    name: "District 11",
    dcmName: "Todd W.",
    dcmEmail: "dist11@area36.org",
    counties: ["Rock", "Pipestone", "Murray", "Nobles"],
    meetingLocation: "Sanford Hospital – Blue Mound Room",
    meetingAddress: "1600 N Kniss Ave, Luverne, MN 56156",
  },
  {
    number: 12,
    name: "District 12",
    dcmName: null,
    dcmEmail: "dist12@area36.org",
    counties: ["Cottonwood", "Watonwan", "Jackson", "Martin", "Faribault"],
    unrepresented: true,
    meetingDay: "3rd Monday",
    meetingTime: "7:00 PM",
    meetingLocation: "Senior Citizens Center",
    meetingAddress: "21 E 1st ST, Sherburn, MN 56171",
  },
  {
    number: 13,
    name: "District 13",
    dcmName: "Barbara H.",
    dcmEmail: "dist13@area36.org",
    counties: ["Anoka"],
    cities: ["NE Minneapolis"],
    meetingDay: "1st Tuesday",
    meetingTime: "7:00 PM",
    meetingLocation: "Coon Rapids United Methodist Church",
    meetingAddress: "10506 Hanson Blvd. N.W., Coon Rapids, MN 55433",
  },
  {
    number: 14,
    name: "District 14",
    dcmName: "Jon G.",
    dcmEmail: "dist14@area36.org",
    counties: ["Wright"],
    website: "district14area36aa.org",
    meetingDay: "1st Monday",
    meetingTime: "7:00 PM",
    meetingLocation: "Buffalo United Methodist Church",
    meetingAddress: "609 8th St NW, Buffalo, MN 55313",
  },
  {
    number: 15,
    name: "District 15",
    dcmName: "Matt T.",
    dcmEmail: "dist15@area36.org",
    counties: ["Washington"],
    website: "www.aadistrict15.org",
    meetingDay: "4th Monday",
    meetingTime: "7:00 PM",
    meetingLocation: "Christ Lutheran Church",
    meetingAddress: "11194 36th St, Lake Elmo, MN 55042",
  },
  {
    number: 16,
    name: "District 16",
    dcmName: "Tina D.",
    dcmEmail: "dist16@area36.org",
    counties: ["Rice"],
    meetingDay: "3rd Thursday",
    meetingTime: "7:00 PM",
    meetingLocation: "Faribault Alano Club",
    meetingAddress: "217 Central Ave, Faribault, MN 55021",
  },
  {
    number: 17,
    name: "District 17",
    dcmName: null,
    dcmEmail: "dist17@area36.org",
    counties: ["Carver", "McLeod", "Sibley"],
    unrepresented: true,
    website: "district17aa.net",
    meetingDay: "2nd Tuesday",
    meetingTime: "7:30 PM",
    meetingLocation: "Assembly of God Church",
    meetingAddress: "10478 Bell Ave, Plato, MN 55370",
  },
  {
    number: 18,
    name: "District 18",
    dcmName: "Michael L.",
    dcmEmail: "dist18@area36.org",
    counties: ["Hennepin"],
    description: "Minneapolis Inner Metro",
    meetingDay: "2nd Thursday",
    meetingTime: "6:30 PM",
    meetingLocation: "On Zoom",
    meetingNote: "Contact DCM for Zoom link",
  },
  {
    number: 19,
    name: "District 19",
    dcmName: "Val L.",
    dcmEmail: "dist19@area36.org",
    counties: ["Dakota"],
    meetingDay: "2nd Wednesday",
    meetingTime: "7:00 PM",
    meetingLocation: "Eagan Community Center",
    meetingAddress: "1501 Central Pkwy, Eagan, MN 55121",
  },
  {
    number: 20,
    name: "District 20",
    dcmName: "Kathleen F.",
    dcmEmail: "dist20@area36.org",
    counties: ["Hennepin (Northwest)"],
    cities: ["Champlin", "Brooklyn Park", "Brooklyn Center", "New Hope", "Crystal", "Robbinsdale"],
    website: "district20area36aa.org",
    meetingDay: "4th Tuesday",
    meetingTime: "7:00 PM",
    meetingLocation: "Twin Lakes Alano Society",
    meetingAddress: "4938 Brooklyn Blvd, Brooklyn Center, MN 55429",
  },
  {
    number: 21,
    name: "District 21",
    dcmName: "Micheala Q.",
    dcmEmail: "dist21@area36.org",
    counties: ["Hennepin (West)"],
    description: "Crow River to west, Hwy 169 to east, Minnetonka to south (including Minnetonka Beach, Orono, Independence)",
    meetingDay: "2nd Tuesday",
    meetingTime: "7:00 PM",
    meetingLocation: "Pilgrim Methodist Church",
    meetingAddress: "4325 Zachary Lane, Plymouth, MN 55441",
  },
  {
    number: 22,
    name: "District 22",
    dcmName: "Kyle A.",
    dcmEmail: "dist22@area36.org",
    counties: ["Hennepin"],
    cities: ["Golden Valley", "St. Louis Park", "Minnetonka"],
    website: "www.district22mn.com",
    description: "Excludes quadrant NW of Hwy 169 & I-394 (District 21)",
    meetingDay: "2nd Wednesday",
    meetingTime: "7:00 PM",
    meetingLocation: "Vista Lutheran Church",
    meetingAddress: "4003 Woodale Ave, Saint Louis Park, MN 55416",
  },
  {
    number: 23,
    name: "District 23",
    dcmName: "Vernon M.",
    dcmEmail: "dist23@area36.org",
    counties: ["Brown", "Nicollet", "Redwood", "Renville"],
    website: "dist23.net",
    note: "Incorporated District 10 in November 2022",
    meetingDay: "3rd Thursday",
    meetingTime: "7:00 PM",
    meetingLocation: "River Valley Church",
    meetingAddress: "100 N Washington, New Ulm, MN 56073",
  },
  {
    number: 24,
    name: "District 24",
    dcmName: "Steve B.",
    dcmEmail: "dist24@area36.org",
    counties: ["Scott"],
    cities: ["Carver", "Chaska", "Shakopee", "Prior Lake", "Savage"],
    meetingDay: "1st Wednesday",
    meetingTime: "6:30 PM",
    meetingLocation: "Shakopee Community Center (Hybrid)",
    meetingAddress: "1255 Fuller St S, Shakopee, MN 55379",
  },
  {
    number: 25,
    name: "District 25",
    dcmName: "Holly S.",
    dcmEmail: "dist25@area36.org",
    counties: ["Hennepin (South)"],
    cities: ["Richfield", "Bloomington"],
    meetingDay: "2nd Wednesday",
    meetingTime: "7:30 PM",
    meetingLocation: "Woodlake Lutheran Church",
    meetingAddress: "7525 Oliver Ave S, Richfield, MN 55423",
  },
  {
    number: 26,
    name: "District 26",
    dcmName: null,
    dcmEmail: null,
    counties: ["Ramsey (partial)"],
    description: "Maryland Ave to north, I-35E to west, Hwy 52 to southwest, Mississippi River to south",
    unrepresented: true,
    meetingDay: "2nd Friday",
    meetingTime: "6:00 PM",
    meetingLocation: "East Side Alano Club",
    meetingAddress: "1099 Payne Ave, St Paul, MN 55130",
  },
  {
    number: 27,
    name: "District 27",
    dcmName: "Elias J.",
    dcmEmail: "dist27@area36.org",
    counties: ["All of Area 36"],
    description: "Spanish-speaking groups throughout Area 36",
    linguistic: true,
    meetingDay: "2nd Saturday",
    meetingTime: "5:30 PM",
    meetingLocation: "Recovery Church",
    meetingAddress: "253 S. State St, Saint Paul, MN",
    meetingNote: "Spanish speaking, LGBTQ+ friendly, child friendly, wheelchair accessible",
  },
]

export default function DistrictsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial values from URL
  const initialSearch = searchParams.get("q") || ""
  const initialDistrict = searchParams.get("district") ? parseInt(searchParams.get("district")!) : null

  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [expandedDistrict, setExpandedDistrict] = React.useState<number | null>(initialDistrict)

  // Update URL when filters change
  const updateURL = React.useCallback((search: string, district: number | null) => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (district) params.set("district", district.toString())

    const queryString = params.toString()
    router.replace(queryString ? `?${queryString}` : "/districts", { scroll: false })
  }, [router])

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
              Area 36 is divided into 26 geographic districts plus District 27, a linguistic district for Spanish-speaking groups.
              Districts are the link between individual A.A. groups and the Area.
            </p>
          </div>
        </section>

        {/* Map Section - Full Width */}
        <section className="py-8 sm:py-12" aria-label="District map">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="aspect-[21/9] sm:aspect-[3/1]">
                <iframe
                  src="https://www.google.com/maps/d/embed?mid=1bWv6ZTXR3oJkSNeEtZHCz-onv1WKKbvi&ehbc=2E312F&ll=44.55241125552111%2C-94.026905&z=7"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Area 36 District Map"
                />
              </div>
            </div>
          </div>
        </section>

        {/* District List Section */}
        <section className="py-8 sm:py-12" aria-label="District list">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Search and Count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <h2 className="text-2xl font-bold text-foreground">All Districts ({districts.length})</h2>
              <div className="relative max-w-sm w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Search by district, county, city, or DCM..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                  aria-label="Search districts"
                />
              </div>
            </div>

            {/* District Cards */}
            <div className="space-y-3">
              {filteredDistricts.map((district) => {
                const isExpanded = expandedDistrict === district.number

                return (
                  <div
                    key={district.number}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Header - Always visible */}
                    <button
                      onClick={() => toggleDistrict(district.number)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-foreground">{district.name}</span>
                        {district.unrepresented && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            DCM Position Open
                          </Badge>
                        )}
                        {district.linguistic && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Spanish Speaking
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">
                          {district.counties.slice(0, 2).join(", ")}
                          {district.counties.length > 2 && ` +${district.counties.length - 2} more`}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
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
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                              <p className="text-foreground">{district.counties.join(", ")}</p>
                              {district.cities && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Cities: {district.cities.join(", ")}
                                </p>
                              )}
                              {district.description && (
                                <p className="text-sm text-muted-foreground mt-1">{district.description}</p>
                              )}
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">DCM</h4>
                              {district.dcmName ? (
                                <p className="text-foreground">{district.dcmName}</p>
                              ) : (
                                <p className="text-muted-foreground italic">Position currently open</p>
                              )}
                            </div>

                            {(district.meetingDay || district.meetingLocation) && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">District Meeting</h4>
                                {district.meetingDay && (
                                  <div className="flex items-center gap-2 text-foreground">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      {district.meetingDay}
                                      {district.meetingTime && ` at ${district.meetingTime}`}
                                    </span>
                                  </div>
                                )}
                                {district.meetingLocation && (
                                  <div className="flex items-start gap-2 text-foreground mt-1">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p>{district.meetingLocation}</p>
                                      {district.meetingAddress && (
                                        <p className="text-sm text-muted-foreground">{district.meetingAddress}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {district.meetingNote && (
                                  <p className="text-sm text-muted-foreground mt-2 italic">{district.meetingNote}</p>
                                )}
                              </div>
                            )}

                            {district.note && (
                              <p className="text-sm text-muted-foreground italic">{district.note}</p>
                            )}
                          </div>

                          {/* Right Column - Actions */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground">Actions</h4>

                            {district.dcmEmail && (
                              <Button asChild variant="outline" className="w-full justify-start">
                                <Link href={`mailto:${district.dcmEmail}`}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Email DCM
                                </Link>
                              </Button>
                            )}

                            {district.website && (
                              <Button asChild variant="outline" className="w-full justify-start">
                                <Link href={`https://${district.website}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Visit District Website
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
                                  Get Directions
                                </Link>
                              </Button>
                            )}

                            {!district.dcmEmail && !district.website && !district.meetingAddress && (
                              <p className="text-sm text-muted-foreground">
                                Contact the Area Chairperson for more information about this district.
                              </p>
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
                  <p className="mt-4 text-muted-foreground">No districts found matching "{searchQuery}"</p>
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
                  Learn more about service structure
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
