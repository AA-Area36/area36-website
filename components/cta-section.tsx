import Link from "next/link"
import { ArrowRight, BookOpen, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* New to Service */}
          <div className="relative overflow-hidden rounded-2xl bg-primary p-8 sm:p-10">
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/20">
                <BookOpen className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
              </div>
              <h2 id="cta-heading" className="mt-6 text-2xl font-bold text-primary-foreground">
                New to Service?
              </h2>
              <p className="mt-4 text-primary-foreground/90 leading-relaxed">
                {
                  "We're glad you're here! Learn about getting involved in Area 36 service and discover how you can carry the message."
                }
              </p>
              <Button asChild variant="secondary" className="mt-6">
                <Link href="/service">
                  Learn Service Basics
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-10 -right-5 h-32 w-32 rounded-full bg-primary-foreground/5"
              aria-hidden="true"
            />
          </div>

          {/* For Professionals */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-foreground">For Professionals</h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Are you a professional looking for more information about Alcoholics Anonymous in southern Minnesota?
                Find resources and information here.
              </p>
              <Button asChild variant="outline" className="mt-6 bg-transparent">
                <Link href="/about#professionals">
                  View Resources
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
