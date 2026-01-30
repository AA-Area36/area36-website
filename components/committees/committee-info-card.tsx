import { Lock, ExternalLink, Mail, MapPin } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export interface InfoCardLink {
  url: string
  label: string
  isProtected?: boolean
}

export interface CommitteeInfoCardProps {
  title: string
  content: string
  email?: string
  address?: string
  link?: InfoCardLink
}

export function CommitteeInfoCard({
  title,
  content,
  email,
  address,
  link,
}: CommitteeInfoCardProps) {
  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold text-foreground mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{content}</p>

      {(email || address) && (
        <div className="space-y-2 text-sm mb-3">
          {email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
              <Link
                href={`mailto:${email}`}
                className="text-primary hover:underline"
              >
                {email}
              </Link>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-muted-foreground whitespace-pre-line">{address}</span>
            </div>
          )}
        </div>
      )}

      {link && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="bg-transparent"
        >
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.isProtected && (
              <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            {link.label}
            <ExternalLink className="h-3 w-3 ml-2" aria-hidden="true" />
          </a>
        </Button>
      )}
    </div>
  )
}
