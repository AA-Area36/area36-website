import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  FileText,
  Download,
  ExternalLink,
  FolderOpen,
  BookOpen,
  Briefcase,
  Lock,
  Hand,
  Accessibility,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const delegateReports = [
  { title: "2025 General Service Conference Report", date: "May 2025", size: "2.4 MB" },
  { title: "2024 Delegate Report Back Schedule Update", date: "June 2024", size: "103.85 KB" },
  { title: "Advisory Actions of the 74th General Service Conference", date: "May 2024", size: "220.37 KB" },
  { title: "2024 Pre-Conference Agenda Items Summary", date: "March 2024", size: "1.8 MB" },
]

const areaDocuments = [
  { title: "2024 Area 36 Approved Budget", date: "January 2024", size: "77.00 KB" },
  { title: "Area 36 Inclement Weather Procedure", date: "2023", size: "46.17 KB" },
  { title: "Area 36 Service Manual", date: "2024", size: "512 KB" },
  { title: "GSR Kit - Getting Started", date: "2024", size: "1.2 MB" },
  { title: "DCM Handbook", date: "2024", size: "890 KB" },
]

const forms = [
  { title: "Group Registration Form", description: "Register a new A.A. group with GSO" },
  { title: "Group Change Form", description: "Update existing group information" },
  { title: "Contribution Form", description: "For group and individual contributions" },
  { title: "Event Submission Form", description: "Submit an event for the calendar" },
]

const conferenceMaterials = [
  { title: "2025 General Service Conference Background", date: "2025", protected: true },
  { title: "Conference Theme and Presentation Topics", date: "2025", protected: false },
  { title: "Regional Forum Information", date: "2025", protected: false },
]

export default function ResourcesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="resources-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 id="resources-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              Resources
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Access forms, documents, delegate reports, and other materials to support your service work in Area 36.
            </p>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-8 border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                  Find a Meeting
                  <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/newsletter">Latest Newsletter</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/service">Service Basics</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="#asl">ASL Resources</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Documents Tabs */}
        <section className="py-12 sm:py-16" aria-label="Documents and forms">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Tabs defaultValue="delegate" className="space-y-8">
              <TabsList className="flex-wrap h-auto gap-2">
                <TabsTrigger value="delegate" className="gap-2">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Delegate Reports
                </TabsTrigger>
                <TabsTrigger value="area" className="gap-2">
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                  Area Documents
                </TabsTrigger>
                <TabsTrigger value="forms" className="gap-2">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Forms
                </TabsTrigger>
                <TabsTrigger value="conference" className="gap-2">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Conference Materials
                </TabsTrigger>
              </TabsList>

              {/* Delegate Reports */}
              <TabsContent value="delegate" className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Delegate Reports</h2>
                  <p className="text-muted-foreground mt-1">
                    Reports and materials from the General Service Conference.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {delegateReports.map((doc) => (
                    <div
                      key={doc.title}
                      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.date} · {doc.size}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Download ${doc.title}`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Area Documents */}
              <TabsContent value="area" className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Area Documents</h2>
                  <p className="text-muted-foreground mt-1">
                    Budgets, procedures, handbooks, and other Area materials.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {areaDocuments.map((doc) => (
                    <div
                      key={doc.title}
                      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderOpen className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.date} · {doc.size}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Download ${doc.title}`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Forms */}
              <TabsContent value="forms" className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Forms</h2>
                  <p className="text-muted-foreground mt-1">Common forms for groups, contributions, and service.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {forms.map((form) => (
                    <div
                      key={form.title}
                      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {form.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{form.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Download ${form.title}`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Conference Materials */}
              <TabsContent value="conference" className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Conference Materials</h2>
                  <p className="text-muted-foreground mt-1">
                    General Service Conference background and related materials.
                  </p>
                  <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Password Protected Materials
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Some conference materials are password protected. Contact your DCM or the Delegate for access.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {conferenceMaterials.map((doc) => (
                    <div
                      key={doc.title}
                      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {doc.protected ? <Lock className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {doc.title}
                          </h3>
                          {doc.protected && (
                            <Badge variant="secondary" className="text-xs">
                              Protected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{doc.date}</p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Download ${doc.title}`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Special Sections */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-label="Additional resources">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* For Professionals */}
              <Card id="professionals">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Briefcase className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>For Professionals</CardTitle>
                  <CardDescription>
                    Resources for healthcare providers, educators, clergy, and other professionals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/information-professionals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. for Professionals (AA.org)
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/sites/default/files/literature/p-42_aamembersMHP.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. as a Resource for Healthcare
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link href="/committees" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Contact CPC Committee →
                  </Link>
                </CardContent>
              </Card>

              {/* Temporary Contact / Bridging the Gap */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Hand className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Temporary Contact Programs</CardTitle>
                  <CardDescription>
                    Bridging the Gap and pre-release contact information for those leaving treatment or corrections.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Help newcomers make their first meeting by becoming a temporary contact or requesting a contact for
                    someone you know.
                  </p>
                  <Link href="/committees" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Contact Treatment Committee →
                  </Link>
                  <Link href="/committees" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Contact Corrections Committee →
                  </Link>
                </CardContent>
              </Card>

              {/* ASL Resources */}
              <Card id="asl">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Accessibility className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>ASL Resources</CardTitle>
                  <CardDescription>Resources for deaf and hard of hearing members.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/accessibility"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. Accessibility Statement
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    To request ASL interpretation for an Area 36 event, please contact the Accessibility Committee.
                  </p>
                  <Link href="/committees" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Contact Accessibility Committee →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* External Links */}
        <section className="py-12 sm:py-16" aria-labelledby="external-links-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="external-links-heading" className="text-2xl font-bold text-foreground mb-6">
              A.A. Resources
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "AA.org", url: "https://www.aa.org", description: "Official A.A. website" },
                { name: "AA Grapevine", url: "https://www.aagrapevine.org", description: "Meeting in print" },
                { name: "La Viña", url: "https://www.aalavina.org", description: "Spanish-language Grapevine" },
                { name: "Find a Meeting", url: "https://www.aa.org/find-aa", description: "Meeting finder" },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {link.name}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </div>
                  <span className="text-sm text-muted-foreground mt-1">{link.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
