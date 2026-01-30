"use client"

import { Mail, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CommitteeFilesSection } from "@/components/committees/committee-files"
import { CommitteeInfoCard } from "@/components/committees/committee-info-card"
import type { CommitteeData } from "./page"
import type { CommitteeFiles } from "@/lib/gdrive/committees"

interface CommitteesContentProps {
  committees: CommitteeData[]
  committeeFiles: CommitteeFiles
}

export function CommitteesContent({ committees, committeeFiles }: CommitteesContentProps) {
  return (
    <Accordion type="single" collapsible className="space-y-4 pb-1">
      {committees.map((committee) => {
        // Get files for this committee based on slug
        const files = committeeFiles[committee.slug] || []
        
        // Separate forms and other files based on filename patterns
        const formPatterns = /form|questionnaire|order/i
        const forms = files.filter((f) => formPatterns.test(f.name))
        const otherFiles = files.filter((f) => !formPatterns.test(f.name))

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

                {/* Forms Section */}
                {forms.length > 0 && (
                  <CommitteeFilesSection
                    title={committee.formsLabel || "Forms"}
                    files={forms}
                  />
                )}

                {/* Files Section */}
                {otherFiles.length > 0 && (
                  <CommitteeFilesSection
                    title={committee.filesLabel || "Resources"}
                    files={otherFiles}
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
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
