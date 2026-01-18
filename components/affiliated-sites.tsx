import Link from "next/link"
import { ExternalLink } from "lucide-react"

const affiliatedSites = [
  { name: "AA.org", url: "https://www.aa.org/", description: "Official A.A. website" },
  { name: "NewToAA.org", url: "https://www.newtoaa.org", description: "Resources for newcomers" },
  { name: "Minneapolis Intergroup", url: "https://aaminneapolis.org/", description: "Minneapolis area meetings" },
  { name: "St. Paul Intergroup", url: "https://www.aastpaul.org/", description: "St. Paul area meetings" },
  { name: "AA Grapevine", url: "https://www.aagrapevine.org/", description: "A.A.'s meeting in print" },
  { name: "Area 35", url: "https://www.area35.org/", description: "Northern Minnesota" },
  { name: "West Central Region", url: "https://westcentralregion.org/", description: "Regional service" },
  { name: "RUSC", url: "https://ruscmn-area36.figma.site/", description: "Recovery, Unity & Service" },
]

export function AffiliatedSites() {
  return (
    <section className="py-12 sm:py-16 border-t border-border" aria-labelledby="affiliated-sites-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 id="affiliated-sites-heading" className="text-2xl font-bold text-foreground">
            Helpful A.A. Resources
          </h2>
          <p className="mt-2 text-muted-foreground">
            Related organizations and resources
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {affiliatedSites.map((site) => (
            <Link
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground group-hover:text-primary transition-colors block truncate">
                  {site.name}
                </span>
                <span className="text-xs text-muted-foreground">{site.description}</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" aria-label="(opens in new tab)" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
