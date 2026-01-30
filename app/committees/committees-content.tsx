"use client"

import { Mail, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CommitteeFilesSection } from "@/components/committees/committee-files"
import { CommitteeInfoCard } from "@/components/committees/committee-info-card"
import type { CommitteeData } from "./page"
import type { CommitteeFiles, CommitteeFile } from "@/lib/gdrive/committees"

interface CommitteesContentProps {
  committees: CommitteeData[]
  committeeFiles: CommitteeFiles
}

// Group files by category, returning categories sorted alphabetically
function groupFilesByCategory(files: CommitteeFile[]) {
  const categorized: Record<string, CommitteeFile[]> = {}
  const uncategorized: CommitteeFile[] = []

  for (const file of files) {
    if (file.category) {
      if (!categorized[file.category]) {
        categorized[file.category] = []
      }
      categorized[file.category].push(file)
    } else {
      uncategorized.push(file)
    }
  }

  // Sort categories alphabetically
  const sortedCategories = Object.keys(categorized).sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  return { categorized, uncategorized, sortedCategories }
}

export function CommitteesContent({ committees, committeeFiles }: CommitteesContentProps) {
  return (
    <Accordion type="single" collapsible className="space-y-4 pb-1">
      {committees.map((committee) => {
        // Get files for this committee based on slug
        const files = committeeFiles[committee.slug] || []
        
        // Group files by category
        const { categorized, uncategorized, sortedCategories } = groupFilesByCategory(files)
        
        // Check if this is the corrections committee for special handling
        const isCorrections = committee.slug === "corrections"
        
        // For corrections, handle Pink Can Plan specially
        const pinkCanPlanFiles = categorized["Pink Can Plan"] || []
        const otherSortedCategories = sortedCategories.filter(cat => cat !== "Pink Can Plan")
        
        // Find the database card index for corrections
        const databaseCardIndex = committee.infoCards?.findIndex(
          card => card.title === "Corrections Database"
        ) ?? -1
        
        // Split info cards for corrections: before database, database, after database
        const cardsBeforeDatabase = isCorrections && databaseCardIndex > 0
          ? committee.infoCards?.slice(0, databaseCardIndex)
          : null
        const databaseCard = isCorrections && databaseCardIndex >= 0
          ? committee.infoCards?.[databaseCardIndex]
          : null
        const cardsAfterDatabase = isCorrections && databaseCardIndex >= 0
          ? committee.infoCards?.slice(databaseCardIndex + 1)
          : null

        return (
          <AccordionItem
            key={committee.name}
            value={committee.name}
            className="rounded-xl border border-border bg-card px-6"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <Users className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-foreground">{committee.name}</span>
                  {committee.chairName && (
                    <span className="ml-2 text-sm text-muted-foreground">Chair: {committee.chairName}</span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="pl-8">
                {/* Description */}
                <div className="text-muted-foreground mb-4">
                  {typeof committee.description === "string" ? (
                    <p>{committee.description}</p>
                  ) : (
                    committee.description
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-2 mb-4">
                  <Link
                    href={`mailto:${committee.email}`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {committee.chairName ? `Chair (${committee.chairName})` : "Contact Committee"}: {committee.email}
                  </Link>
                  {committee.archivistName && (
                    <div>
                      <Link
                        href={`mailto:${committee.archivistEmail}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Area Archivist ({committee.archivistName}): {committee.archivistEmail}
                      </Link>
                    </div>
                  )}
                  {committee.webmasterName && (
                    <div>
                      <Link
                        href={`mailto:${committee.webmasterEmail}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Webmaster ({committee.webmasterName}): {committee.webmasterEmail}
                      </Link>
                    </div>
                  )}
                  {committee.additionalContacts?.map((contact) => (
                    <div key={contact.email}>
                      <Link
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {contact.role} ({contact.name}): {contact.email}
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Related Page Link */}
                {committee.relatedPageUrl && (
                  <div className="mb-4">
                    <Link
                      href={committee.relatedPageUrl}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {committee.relatedPageText || "Learn more"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                )}

                {isCorrections ? (
                  <>
                    {/* Pink Can Plan Forms section - special placement for corrections */}
                    {pinkCanPlanFiles.length > 0 && (
                      <CommitteeFilesSection
                        title="Pink Can Plan Forms"
                        files={pinkCanPlanFiles}
                      />
                    )}
                    
                    {/* Info Cards before database */}
                    {cardsBeforeDatabase?.map((card, index) => (
                      <CommitteeInfoCard
                        key={index}
                        title={card.title}
                        content={card.content}
                        email={card.email}
                        address={card.address}
                        link={card.link}
                      />
                    ))}
                    
                    {/* Database Card */}
                    {databaseCard && (
                      <CommitteeInfoCard
                        title={databaseCard.title}
                        content={databaseCard.content}
                        email={databaseCard.email}
                        address={databaseCard.address}
                        link={databaseCard.link}
                      />
                    )}
                    
                    {/* Other categorized files (alphabetically) */}
                    {otherSortedCategories.map((category) => (
                      <CommitteeFilesSection
                        key={category}
                        title={category}
                        files={categorized[category]}
                      />
                    ))}
                    
                    {/* Resources Section (uncategorized) - always last */}
                    {uncategorized.length > 0 && (
                      <CommitteeFilesSection
                        title="Resources"
                        files={uncategorized}
                      />
                    )}
                    
                    {/* Info Cards after database */}
                    {cardsAfterDatabase?.map((card, index) => (
                      <CommitteeInfoCard
                        key={`after-${index}`}
                        title={card.title}
                        content={card.content}
                        email={card.email}
                        address={card.address}
                        link={card.link}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {/* Categorized files - alphabetically sorted */}
                    {sortedCategories.map((category) => (
                      <CommitteeFilesSection
                        key={category}
                        title={category}
                        files={categorized[category]}
                      />
                    ))}

                    {/* Resources Section (uncategorized) - always last */}
                    {uncategorized.length > 0 && (
                      <CommitteeFilesSection
                        title="Resources"
                        files={uncategorized}
                      />
                    )}

                    {/* Info Cards */}
                    {committee.infoCards?.map((card, index) => (
                      <CommitteeInfoCard
                        key={index}
                        title={card.title}
                        content={card.content}
                        email={card.email}
                        address={card.address}
                        link={card.link}
                      />
                    ))}
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
