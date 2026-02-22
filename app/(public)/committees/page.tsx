import type { Metadata } from "next"
import { Mail, Info } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommitteesLoader } from "./committees-loader"
import { PageHeader } from "@/components/page-header"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Committees & Officers | Area 36",
  description:
    "Meet the elected officers and standing committees serving Area 36, and find contact information for each.",
}

export interface OfficerData {
  role: string
  name: string
  email: string
  description: string
  interim?: boolean
}

export interface CommitteeData {
  name: string
  slug: string
  chairName: string | null
  email: string
  description: string | string[]
  archivistName?: string
  archivistEmail?: string
  webmasterName?: string
  webmasterEmail?: string
  additionalContacts?: { role: string; name: string; email: string }[]
  infoCards?: {
    title: string
    content: string
    email?: string
    address?: string
    link?: { url: string; label: string; isProtected?: boolean }
  }[]
  relatedPageUrl?: string
  relatedPageText?: string
}

export default async function CommitteesPage() {
  const locale = await getRequestLocale()
  const committeesContent = await getContent("committees", locale)
  const { t } = createTranslator(committeesContent)

  const officers: OfficerData[] = [
    {
      role: t("officers.delegate.role", "Delegate"),
      name: t("officers.delegate.name", "Doug H."),
      email: t("officers.delegate.email", "delegate@area36.org"),
      description: t(
        "officers.delegate.description",
        "The GSC delegate is elected every odd-numbered year to represent the area at the annual meeting of the conference in New York, and to bring back to the area the results of the Conference meeting.",
      ),
    },
    {
      role: t("officers.alternateDelegate.role", "Alternate Delegate"),
      name: t("officers.alternateDelegate.name", "Jennifer A."),
      email: t("officers.alternateDelegate.email", "altdelegate@area36.org"),
      description: t(
        "officers.alternateDelegate.description",
        "The alternate delegate serves as a valuable assistant, often traveling with the delegate or giving reports. In Area 36, the alternate delegate also serves as the Structure Committee Chair.",
      ),
    },
    {
      role: t("officers.chairperson.role", "Chairperson"),
      name: t("officers.chairperson.name", "Matt B."),
      email: t("officers.chairperson.email", "chairperson@area36.org"),
      description: t(
        "officers.chairperson.description",
        "The Area Chair presides at Area Assembly and Area Committee meetings, sets the agenda, appoints committee chairpersons, and prepares the annual budget.",
      ),
    },
    {
      role: t("officers.alternateChairperson.role", "Alternate Chairperson"),
      name: t("officers.alternateChairperson.name", "Eric M."),
      email: t("officers.alternateChairperson.email", "altchairperson@area36.org"),
      description: t(
        "officers.alternateChairperson.description",
        "The Alternate Area Chair works closely with the Area Chair and presides over meetings when the Chair is unable to attend. Also serves as the Finance Committee Chair.",
      ),
    },
    {
      role: t("officers.secretary.role", "Secretary"),
      name: t("officers.secretary.name", "Jennifer G."),
      email: t("officers.secretary.email", "secretary@area36.org"),
      description: t(
        "officers.secretary.description",
        "The Secretary records the minutes of Area Assemblies, Area Committee Meetings, and Area Officer meetings, and develops agenda material for Area Assemblies.",
      ),
      interim: true,
    },
    {
      role: t("officers.treasurer.role", "Treasurer"),
      name: t("officers.treasurer.name", "Nora H."),
      email: t("officers.treasurer.email", "treasurer@area36.org"),
      description: t(
        "officers.treasurer.description",
        "The Treasurer handles all area monies, keeping records of contributions and disbursements according to the Area Financial Guidelines.",
      ),
    },
  ]

  const committees: CommitteeData[] = [
    {
      name: t("committeesData.accessibilities.name", "Accessibilities"),
      slug: t("committeesData.accessibilities.slug", "accessibilities"),
      chairName: t("committeesData.accessibilities.chairName", "Dan H."),
      email: t("committeesData.accessibilities.email", "accessibilities@area36.org"),
      description: [
        t(
          "committeesData.accessibilities.descriptionParagraphs.0",
          'Greetings, and welcome to the Accessibilities Committee page. Quite often the first question is "What exactly constitutes a remote community?" and "What does the Accessibilities committee actually do?".',
        ),
        t(
          "committeesData.accessibilities.descriptionParagraphs.1",
          "The definition of Accessibilities community is where it is difficult to carry the AA message because of language, culture, geography, or life condition. As you can see that applies equally as well to communities in the most rural parts of the Area as it does to communities in the heart of Minneapolis who, for a range of reasons, are not getting AA's message. Thus, the central mission of this committee is to go to any lengths necessary to carry AA's message to all those who need it and is just one more link in the chain or responsibility in our effort to help the alcoholic to who still suffers.",
        ),
        t(
          "committeesData.accessibilities.descriptionParagraphs.2",
          "At first glance it may seem that this committee reproduces some of the work of the PI or CPC committees. In reality, while the RC does work closely with these two committees, the RC serves a different need and helps fill the gap in our Area's overall 12-step work by reaching out to various communities that might not fall under the responsibility of the other area committees.",
        ),
      ],
    },
    {
      name: t("committeesData.archives.name", "Archives"),
      slug: t("committeesData.archives.slug", "archives"),
      chairName: null,
      email: t("committeesData.archives.email", "archives@area36.org"),
      archivistName: t("committeesData.archives.archivistName", "Vince F."),
      archivistEmail: t("committeesData.archives.archivistEmail", "archivist@area36.org"),
      description: t(
        "committeesData.archives.description",
        "The Archives Committee gathers current and historical information about A.A., especially in our Area and preserves it in a meaningful order. This committee provides a clearinghouse of information in the Area with respect to Archives, coordinating the exchange of ideas and resources between districts. Provides experience and assistance in developing projects that will further the carrying of our A.A. message with respect to Archives.",
      ),
    },
    {
      name: t("committeesData.cpc.name", "Cooperation with the Professional Community (CPC)"),
      slug: t("committeesData.cpc.slug", "cpc"),
      chairName: t("committeesData.cpc.chairName", "Jim M."),
      email: t("committeesData.cpc.email", "cpc@area36.org"),
      description: t(
        "committeesData.cpc.description",
        "Works with A.A. groups to provide information on Alcoholics Anonymous to professionals who often meet alcoholics before we do.",
      ),
    },
    {
      name: t("committeesData.corrections.name", "Corrections"),
      slug: t("committeesData.corrections.slug", "corrections"),
      chairName: t("committeesData.corrections.chairName", "Dave A."),
      email: t("committeesData.corrections.email", "corrections@area36.org"),
      description: t(
        "committeesData.corrections.description",
        "Coordinates the work of A.A. groups in carrying the A.A. message to alcoholics in correctional facilities. Manages the Temporary Contact Program and the Pink Can Plan for literature distribution.",
      ),
      additionalContacts: [
        {
          role: t(
            "committeesData.corrections.additionalContacts.0.role",
            "Temporary Contact Coordinator",
          ),
          name: t("committeesData.corrections.additionalContacts.0.name", "Brian M."),
          email: t("committeesData.corrections.additionalContacts.0.email", "ctcp@area36.org"),
        },
        {
          role: t("committeesData.corrections.additionalContacts.1.role", "Pink Can Coordinator"),
          name: t("committeesData.corrections.additionalContacts.1.name", "Patrick W."),
          email: t(
            "committeesData.corrections.additionalContacts.1.email",
            "pinkcanplan@area36.org",
          ),
        },
      ],
      infoCards: [
        {
          title: t("committeesData.corrections.infoCards.0.title", "Submit Pink Can Plan Orders"),
          content: t(
            "committeesData.corrections.infoCards.0.content",
            "Mail completed forms to the address below or email them to the Pink Can Coordinator.",
          ),
          email: t(
            "committeesData.corrections.infoCards.0.email",
            "pinkcanplan@area36.org",
          ),
          address: t(
            "committeesData.corrections.infoCards.0.address",
            "Pink Can Plan\nPO Box 41633\nPlymouth, MN 55441-0633",
          ),
        },
        {
          title: t("committeesData.corrections.infoCards.1.title", "Corrections Database"),
          content: t(
            "committeesData.corrections.infoCards.1.content",
            "This database contains information about the correctional facilities in Minnesota. Only those with an Area36.org email account can access this database. The database is also password protected. Contact the Corrections Chair about the password.",
          ),
          link: {
            url: t(
              "committeesData.corrections.infoCards.1.link.url",
              "https://drive.google.com/file/d/1c6XjH6ODGmRAbFKEEL0APvMza3P9oZYE/view?usp=sharing",
            ),
            label: t(
              "committeesData.corrections.infoCards.1.link.label",
              "Access Database",
            ),
            isProtected: true,
          },
        },
      ],
    },
    {
      name: t("committeesData.finance.name", "Finance"),
      slug: t("committeesData.finance.slug", "finance"),
      chairName: t("committeesData.finance.chairName", "Eric M."),
      email: t("committeesData.finance.email", "finance@area36.org"),
      description: t(
        "committeesData.finance.description",
        "Monitors the Area's financial needs, policies and practices. Responsible for reminding groups of their Seventh Tradition opportunities. Reviews and updates the Area financial guidelines as needed.",
      ),
    },
    {
      name: t("committeesData.grapevine.name", "Grapevine"),
      slug: t("committeesData.grapevine.slug", "grapevine"),
      chairName: t("committeesData.grapevine.chairName", "Tom W."),
      email: t("committeesData.grapevine.email", "grapevine@area36.org"),
      description: t(
        "committeesData.grapevine.description",
        "Coordinates the work of A.A. members, groups, and districts to read, subscribe to and utilize the Grapevine and Grapevine-produced materials. Encourages members to contribute written material for publication.",
      ),
    },
    {
      name: t("committeesData.literature.name", "Literature"),
      slug: t("committeesData.literature.slug", "literature"),
      chairName: t("committeesData.literature.chairName", "Andy J."),
      email: t("committeesData.literature.email", "literature@area36.org"),
      description: t(
        "committeesData.literature.description",
        "Provides information to A.A. members and groups encouraging the use of Conference approved literature and maintains inventory of the Area literature.",
      ),
    },
    {
      name: t("committeesData.newsletter.name", "Newsletter"),
      slug: t("committeesData.newsletter.slug", "newsletter"),
      chairName: t("committeesData.newsletter.chairName", "Joe S."),
      email: t("committeesData.newsletter.email", "newsletter@area36.org"),
      description: t(
        "committeesData.newsletter.description",
        "Publishes The Pigeon four times a year, an informative newsletter about service activities and opportunities throughout the Area.",
      ),
    },
    {
      name: t("committeesData.pi.name", "Public Information (PI)"),
      slug: t("committeesData.pi.slug", "pi"),
      chairName: null,
      email: t("committeesData.pi.email", "pi@area36.org"),
      description: t(
        "committeesData.pi.description",
        "Increases awareness of A.A. in the general public. Also monitors anonymity breaks at the level of press, radio and film.",
      ),
    },
    {
      name: t("committeesData.registrar.name", "Registrar"),
      slug: t("committeesData.registrar.slug", "registrar"),
      chairName: t("committeesData.registrar.chairName", "Justin P."),
      email: t("committeesData.registrar.email", "registrar@area36.org"),
      description: t(
        "committeesData.registrar.description",
        "Maintains an accurate database and mailing list of the groups and trusted servants in the Area. This database is used for mailing lists, the Area Directory, and group listings.",
      ),
    },
    {
      name: t("committeesData.structure.name", "Structure"),
      slug: t("committeesData.structure.slug", "structure"),
      chairName: t("committeesData.structure.chairName", "Jennifer A."),
      email: t("committeesData.structure.email", "structure@area36.org"),
      description: t(
        "committeesData.structure.description",
        "Reviews how the area functions internally on a continual basis. The Alternate Delegate serves as the Structure Committee Chair.",
      ),
    },
    {
      name: t("committeesData.technology.name", "Technology"),
      slug: t("committeesData.technology.slug", "technology"),
      chairName: t("committeesData.technology.chairName", "Becky N."),
      email: t("committeesData.technology.email", "technology@area36.org"),
      webmasterName: t("committeesData.technology.webmasterName", "Josh G."),
      webmasterEmail: t("committeesData.technology.webmasterEmail", "webmaster@area36.org"),
      description: t(
        "committeesData.technology.description",
        "Develops and maintains the Area website, ensuring information is kept current. Addresses technical issues including errors, broken links, and missing documents.",
      ),
    },
    {
      name: t("committeesData.treatment.name", "Treatment"),
      slug: t("committeesData.treatment.slug", "treatment"),
      chairName: t("committeesData.treatment.chairName", "Brad S."),
      email: t("committeesData.treatment.email", "treatment@area36.org"),
      description: [
        t(
          "committeesData.treatment.descriptionParagraphs.0",
          "The Treatment Facilities Committee leads and coordinates the work of AA members and groups in carrying the A.A. message to alcoholics in treatment facilities.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.1",
          "A.A. TEMPORARY CONTACT VOLUNTEERS",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.2",
          "A TEMPORARY CONTACT is a member of Alcoholics Anonymous who works with alcoholics both in and coming out of treatment facilities/programs.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.3",
          "THE PRIMARY PURPOSE IS TO HELP THEM BRIDGE THE GAP TO ALCOHOLICS ANONYMOUS.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.4",
          "It is a short term arrangement (30 - 90 days) until the new member has become established in a group and has found permanent sponsorship.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.5",
          "The TEMPORARY CONTACT may do such things as visit the alcoholic before they leave the facility, provide them with AA conference approved literature and a local meeting list, let them know about the AA Grapevine magazine, how to subscribe and possibly give them a couple of old Grapevine issues, visit with them for one on one sharing, take them to a variety of meetings before and after they leave (especially their first day back in the community), meet them at meetings, introduce them to as many AA's as possible, help them into the after meeting coffee groups, call them, ensure they have the phone numbers of several AA's, talk with them about sponsorship and guide them to selecting a more permanent sponsor and a home group.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.6",
          "The TEMPORARY CONTACT must ensure that their information on the contact list is current and accurate.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.7",
          "TEMPORARY CONTACTS will be called upon to help a prospect/patient by matching their ZIP codes, gender and age group whenever possible.",
        ),
        t(
          "committeesData.treatment.descriptionParagraphs.8",
          "The volunteer lists may be made available to Intergroups, District and Area committees. A call may come from any of these sources in addition to directly from a prospective member.",
        ),
      ],
      additionalContacts: [
        {
          role: t(
            "committeesData.treatment.additionalContacts.0.role",
            "Temporary Contact Coordinator",
          ),
          name: t("committeesData.treatment.additionalContacts.0.name", "Patrick S."),
          email: t("committeesData.treatment.additionalContacts.0.email", "ttcc@area36.org"),
        },
      ],
      relatedPageUrl: t(
        "committeesData.treatment.relatedPageUrl",
        "/treatment-temporary-contact-program",
      ),
      relatedPageText: t(
        "committeesData.treatment.relatedPageText",
        "Fill out volunteer or newcomer forms",
      ),
    },
  ]

  const interimLabel = t("officersSection.interimLabel", "(Interim)")

  return (
    <>
      <PageHeader
        title={t("header.title", "Committees & Officers")}
        description={t(
          "header.description",
          "Area 36 is served by elected officers and standing committees, all working together to carry the message of Alcoholics Anonymous throughout southern Minnesota.",
        )}
        ariaId="committees-heading"
      />

      <section className="py-12 sm:py-16" aria-labelledby="officers-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 id="officers-heading" className="text-2xl font-bold text-foreground">
              {t("officersSection.title", "Area Officers")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t(
                "officersSection.description",
                "Elected officers serve two-year terms and are responsible for the overall operations of the Area.",
              )}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {officers.map((officer) => (
              <Card key={officer.role} className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {officer.role}
                    {officer.interim && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">{interimLabel}</span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{officer.name}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{officer.description}</p>
                  <Link
                    href={`mailto:${officer.email}`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {officer.email}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="standing-committees-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 id="standing-committees-heading" className="text-2xl font-bold text-foreground">
              {t("committeesSection.title", "Standing Committees")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t(
                "committeesSection.description",
                "Standing committees focus on specific areas of service and are open to all interested A.A. members.",
              )}
            </p>
          </div>

          <CommitteesLoader committees={committees} content={committeesContent} />
        </div>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="involved-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Info className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 id="involved-heading" className="text-xl font-bold text-foreground">
                  {t("getInvolved.title", "Get Involved in Service")}
                </h2>
                <p className="mt-2 text-muted-foreground max-w-2xl">
                  {t(
                    "getInvolved.description",
                    "All committee meetings are open to any interested A.A. member. Service is a vital part of recovery and a great way to give back to the fellowship that helped you.",
                  )}
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    href="/service-basics"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    {t("getInvolved.serviceBasicsLinkLabel", "Learn about service basics →")}
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    {t("getInvolved.contactLinkLabel", "Contact us to get started →")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
