"use client"

import { useState, useTransition, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Building2, Mail, ArrowLeft, CheckCircle, Shield, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { correctionsContactFormSchema, type CorrectionsContactFormData } from "@/lib/schemas/corrections-tcp"
import { submitCorrectionsContactForm } from "./actions"

function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CorrectionsContactFormData>({
    resolver: zodResolver(correctionsContactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      recaptchaToken: "",
    },
  })

  const onSubmit = useCallback(
    async (data: CorrectionsContactFormData) => {
      setSubmitError(null)

      startTransition(async () => {
        try {
          if (!executeRecaptcha) {
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            return
          }
          const token = await executeRecaptcha("corrections_contact_form")
          const result = await submitCorrectionsContactForm({ ...data, recaptchaToken: token })

          if (result.success) {
            setSubmitted(true)
          } else {
            setSubmitError(result.error ?? "An error occurred")
          }
        } catch (error) {
          console.error("Form submission error:", error)
          setSubmitError("An error occurred. Please try again.")
        }
      })
    },
    [executeRecaptcha]
  )

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Request Submitted!</h3>
        <p className="mt-2 text-muted-foreground">
          Thank you for your interest. The Corrections TCP Coordinator will contact you shortly.
        </p>
        <Button
          variant="outline"
          className="mt-6 bg-transparent"
          onClick={() => {
            setSubmitted(false)
            reset()
          }}
        >
          Submit Another Request
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="corrections-email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>This form is protected by Google reCAPTCHA v3.</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting...
          </>
        ) : (
          "Submit Request"
        )}
      </Button>
    </form>
  )
}

function CorrectionsTCPContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="corrections-tcp-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <Link
                href="/temporary-contact-programs"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Temporary Contact Programs
              </Link>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Corrections</span>
              </div>
              <h1 id="corrections-tcp-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                Corrections Temporary Contact Program
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Helping alcoholics transition from correctional facilities to the A.A. community.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-12 sm:py-16" aria-labelledby="contact-form-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Information */}
              <div>
                <h2 id="contact-form-heading" className="text-2xl font-bold text-foreground mb-4">
                  Get Connected
                </h2>
                <p className="text-muted-foreground mb-4">
                  If you are currently incarcerated or about to be released and want help connecting with A.A. meetings
                  in your community, we can help. A temporary contact is an A.A. member who will:
                </p>
                <ul className="space-y-2 text-muted-foreground mb-6">
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    Meet you or contact you after your release
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    Take you to your first A.A. meeting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    Introduce you to other members
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    Help you find meetings in your area
                  </li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  If you would like to volunteer as a temporary contact for those in corrections, or if you need more
                  information about the Corrections TCP, please fill out the form and we will get back to you.
                </p>
                <p className="text-muted-foreground">
                  You can also reach us directly at{" "}
                  <Link href="mailto:ctcp@area36.org" className="text-primary hover:underline">
                    ctcp@area36.org
                  </Link>
                </p>
              </div>

              {/* Form */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Contact Request</CardTitle>
                  <CardDescription>
                    Fill out this form to request more information or to get connected with the Corrections TCP.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContactForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pink Can Plan */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="pink-can-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="max-w-2xl">
                <h2 id="pink-can-heading" className="text-2xl font-bold text-foreground mb-4">
                  The Pink Can Plan
                </h2>
                <p className="text-muted-foreground mb-4">
                  The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional
                  facilities. Contributions to the Pink Can Plan help provide literature, support for meetings inside
                  facilities, and other resources.
                </p>
                <p className="text-muted-foreground mb-6">
                  To learn more or contribute to the Pink Can Plan, contact the Pink Can Coordinator.
                </p>
                <Button asChild>
                  <Link href="mailto:pinkcanplan@area36.org">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    pinkcanplan@area36.org
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 sm:py-16" aria-labelledby="committee-contact-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 id="committee-contact-heading" className="text-2xl font-bold text-foreground mb-4">
                Corrections Committee
              </h2>
              <p className="text-muted-foreground mb-6">
                The Area 36 Corrections Committee coordinates the work of A.A. groups in carrying the A.A. message to
                alcoholics in correctional facilities. For more information about corrections work in Area 36:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild>
                  <Link href="mailto:corrections@area36.org">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    corrections@area36.org
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/committees">View All Committees</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default function CorrectionsTCPPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!siteKey) {
    return <CorrectionsTCPContent />
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <CorrectionsTCPContent />
    </GoogleReCaptchaProvider>
  )
}
