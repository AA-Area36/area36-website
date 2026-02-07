import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type PageHeaderVariant = "default" | "compact" | "featured"

interface PageHeaderProps {
  /** Page title */
  title: string | React.ReactNode
  /** Primary description below the title */
  description?: string | React.ReactNode
  /** ID for aria-labelledby on the section */
  ariaId?: string

  /**
   * Visual variant:
   * - "default"  — py-16 sm:py-20, no icon/badge
   * - "compact"  — py-12 sm:py-16, no icon/badge
   * - "featured" — py-16 sm:py-24, with icon + badge
   */
  variant?: PageHeaderVariant

  /** Lucide icon component (featured variant) */
  icon?: LucideIcon
  /** Small uppercase label above the title (featured variant) */
  badge?: string

  /** Optional back navigation link */
  backLink?: { href: string; label: string }

  /** Secondary description (e.g., disclaimer, italic note) */
  secondaryDescription?: string | React.ReactNode
  /** Additional className for the secondary description */
  secondaryDescriptionClassName?: string

  /** Max width for the text content — defaults to "3xl" */
  maxWidth?: "2xl" | "3xl"

  /** Action buttons rendered alongside the title (flex row on lg) */
  actions?: React.ReactNode
  /** Side content rendered next to the header block (flex row on sm/md) */
  aside?: React.ReactNode
  /** Extra content rendered after the description */
  children?: React.ReactNode
}

const paddingMap: Record<PageHeaderVariant, string> = {
  default: "py-16 sm:py-20",
  compact: "py-12 sm:py-16",
  featured: "py-16 sm:py-24",
}

const maxWidthMap = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
}

export function PageHeader({
  title,
  description,
  ariaId,
  variant = "default",
  icon: Icon,
  badge,
  backLink,
  secondaryDescription,
  secondaryDescriptionClassName,
  maxWidth = "3xl",
  actions,
  aside,
  children,
}: PageHeaderProps) {
  const padding = paddingMap[variant]
  const mwClass = maxWidthMap[maxWidth]

  // If there are actions, use a flex layout (Events pattern)
  const hasFlexLayout = !!actions || !!aside

  return (
    <section
      className={`bg-gradient-to-b from-primary/5 to-background ${padding}`}
      {...(ariaId ? { "aria-labelledby": ariaId } : {})}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {hasFlexLayout ? (
          <div
            className={
              aside
                ? "flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
                : "flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
            }
          >
            <div className={aside ? undefined : mwClass}>
              <HeaderContent
                title={title}
                description={description}
                ariaId={ariaId}
                variant={variant}
                Icon={Icon}
                badge={badge}
                backLink={backLink}
                secondaryDescription={secondaryDescription}
                secondaryDescriptionClassName={secondaryDescriptionClassName}
                mwClass={undefined}
              />
            </div>
            {actions}
            {aside}
          </div>
        ) : (
          <div className={mwClass}>
            <HeaderContent
              title={title}
              description={description}
              ariaId={ariaId}
              variant={variant}
              Icon={Icon}
              badge={badge}
              backLink={backLink}
              secondaryDescription={secondaryDescription}
              secondaryDescriptionClassName={secondaryDescriptionClassName}
              mwClass={undefined}
            />
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function HeaderContent({
  title,
  description,
  ariaId,
  variant,
  Icon,
  badge,
  backLink,
  secondaryDescription,
  secondaryDescriptionClassName,
  mwClass,
}: {
  title: string | React.ReactNode
  description?: string | React.ReactNode
  ariaId?: string
  variant?: PageHeaderVariant
  Icon?: LucideIcon
  badge?: string
  backLink?: { href: string; label: string }
  secondaryDescription?: string | React.ReactNode
  secondaryDescriptionClassName?: string
  mwClass?: string
}) {
  const isFeatured = variant === "featured"
  const descSpacing = isFeatured ? "mt-6" : "mt-4"

  return (
    <>
      {backLink && (
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      )}

      {isFeatured && Icon && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          {badge && (
            <span className="text-sm font-medium text-primary uppercase tracking-wide">
              {badge}
            </span>
          )}
        </div>
      )}

      <h1
        {...(ariaId ? { id: ariaId } : {})}
        className="text-4xl font-bold text-foreground sm:text-5xl"
      >
        {title}
      </h1>

      {description && (
        <p
          className={`${descSpacing} text-lg text-muted-foreground leading-relaxed ${mwClass ?? ""}`}
        >
          {description}
        </p>
      )}

      {secondaryDescription && (
        <p
          className={`mt-4 text-muted-foreground leading-relaxed ${secondaryDescriptionClassName ?? ""}`}
        >
          {secondaryDescription}
        </p>
      )}
    </>
  )
}
