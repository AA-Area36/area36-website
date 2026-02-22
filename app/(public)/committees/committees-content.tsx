"use client"

import { Mail, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CommitteeFilesSection } from "@/components/committees/committee-files"
import { CommitteeInfoCard } from "@/components/committees/committee-info-card"
import type { CommitteeData } from "./page"
import type { CommitteeFiles, CommitteeFile } from "@/lib/gdrive/committees"
import { createTranslator } from "@/lib/content/t"
import type { ContentDoc } from "@/lib/content/schema"

interface CommitteesContentProps {
  committees: CommitteeData[]
  committeeFiles: CommitteeFiles
  content?: ContentDoc
}

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

  const sortedCategories = Object.keys(categorized).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )

  return { categorized, uncategorized, sortedCategories }
}

export function CommitteesContent({ committees, committeeFiles, content }: CommitteesContentProps) {
  const { t } = createTranslator(content ?? {})
  const chairLabel = t("committeeUi.chairLabel", "Chair")
  const contactCommitteeLabel = t("committeeUi.contactCommitteeLabel", "Contact Committee")
  const archivistLabel = t("committeeUi.archivistLabel", "Area Archivist")
  const webmasterLabel = t("committeeUi.webmasterLabel", "Webmaster")
  const relatedLinkLabel = t("committeeUi.relatedLinkLabel", "Learn more")
  const resourcesTitle = t("committeeUi.resourcesTitle", "Resources")
  const pinkCanFormsTitle = t("committeeUi.pinkCanFormsTitle", "Pink Can Plan Forms")
  const correctionsDatabaseTitle = t("committeeUi.correctionsDatabaseTitle", "Corrections Database")

  return (
    <Accordion type="single" collapsible className="space-y-4 pb-1">
      {committees.map((committee) => {
        const files = committeeFiles[committee.slug] || []
        const { categorized, uncategorized, sortedCategories } = groupFilesByCategory(files)

        const isCorrections = committee.slug === "corrections"
        const pinkCanPlanFiles = categorized["Pink Can Plan"] || []
        const otherSortedCategories = sortedCategories.filter((cat) => cat !== "Pink Can Plan")

        const databaseCardIndex =
          committee.infoCards?.findIndex((card) => card.title === correctionsDatabaseTitle) ?? -1

        const cardsBeforeDatabase =
          isCorrections && databaseCardIndex > 0
            ? committee.infoCards?.slice(0, databaseCardIndex)
            : null
        const databaseCard =
          isCorrections && databaseCardIndex >= 0
            ? committee.infoCards?.[databaseCardIndex]
            : null
        const cardsAfterDatabase =
          isCorrections && databaseCardIndex >= 0
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
                    <span className="ml-2 text-sm text-muted-foreground">
                      {chairLabel}: {committee.chairName}
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="pl-8">
                <div className="text-muted-foreground mb-4">
                  {Array.isArray(committee.description) ? (
                    <div className="space-y-3">
                      {committee.description.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <p>{committee.description}</p>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <Link
                      href={`mailto:${committee.email}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {committee.chairName
                        ? `${chairLabel} (${committee.chairName})`
                        : contactCommitteeLabel}
                      : {committee.email}
                    </Link>
                  </div>
                  {committee.archivistName && (
                    <div>
                      <Link
                        href={`mailto:${committee.archivistEmail}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {archivistLabel} ({committee.archivistName}): {committee.archivistEmail}
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
                        {webmasterLabel} ({committee.webmasterName}): {committee.webmasterEmail}
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

                {committee.relatedPageUrl && (
                  <div className="mb-4">
                    <Link
                      href={committee.relatedPageUrl}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {committee.relatedPageText || relatedLinkLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                )}

                {isCorrections ? (
                  <>
                    {pinkCanPlanFiles.length > 0 && (
                      <CommitteeFilesSection title={pinkCanFormsTitle} files={pinkCanPlanFiles} />
                    )}

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

                    {databaseCard && (
                      <CommitteeInfoCard
                        title={databaseCard.title}
                        content={databaseCard.content}
                        email={databaseCard.email}
                        address={databaseCard.address}
                        link={databaseCard.link}
                      />
                    )}

                    {otherSortedCategories.map((category) => (
                      <CommitteeFilesSection key={category} title={category} files={categorized[category]} />
                    ))}

                    {uncategorized.length > 0 && (
                      <CommitteeFilesSection title={resourcesTitle} files={uncategorized} />
                    )}

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
                    {sortedCategories.map((category) => (
                      <CommitteeFilesSection key={category} title={category} files={categorized[category]} />
                    ))}

                    {uncategorized.length > 0 && (
                      <CommitteeFilesSection title={resourcesTitle} files={uncategorized} />
                    )}

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
