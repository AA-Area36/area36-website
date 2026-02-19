"use client"

import { useState, useTransition, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Building2, Mail, CheckCircle, Shield, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { correctionsContactFormSchema, type CorrectionsContactFormData } from "@/lib/schemas/corrections-tcp"
import { submitCorrectionsContactForm } from "./actions"

function VolunteerForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CorrectionsContactFormData>({
    resolver: zodResolver(correctionsContactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "",
      streetAddress: "",
      city: "",
      county: "",
      state: "",
      zipCode: "",
      email: "",
      sobrietyDate: "",
      phonePrimary: "",
      phoneSecondary: "",
      birthYear: "",
      isSpanishSpeaking: false,
      otherLanguages: "",
      homeGroup: "",
      notes: "",
      recaptchaToken: "",
    },
  })

  const isSpanishSpeaking = watch("isSpanishSpeaking")

  const onSubmit = useCallback(
    async (data: CorrectionsContactFormData) => {
      setSubmitError(null)

      startTransition(async () => {
        try {
          if (!executeRecaptcha) {
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            return
          }
          const token = await executeRecaptcha("corrections_volunteer_form")
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
        <h3 className="mt-4 text-lg font-semibold text-foreground">Volunteer Sign Up Received</h3>
        <p className="mt-2 text-muted-foreground">
          Thank you for volunteering. The Corrections TCP Coordinator will contact you soon.
        </p>
        <Button
          variant="outline"
          className="mt-6 bg-transparent"
          onClick={() => {
            setSubmitted(false)
            reset()
          }}
        >
          Submit Another Volunteer
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-gender">
            Gender <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-gender" {...register("gender")} />
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-birthYear">
            Birth Year <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-birthYear" inputMode="numeric" maxLength={4} {...register("birthYear")} />
          {errors.birthYear && <p className="text-sm text-destructive">{errors.birthYear.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-streetAddress">Street Address</Label>
        <Input id="corrections-streetAddress" {...register("streetAddress")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-city">
            City <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-county">County</Label>
          <Input id="corrections-county" {...register("county")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-state">State</Label>
          <Input id="corrections-state" {...register("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-zipCode">Zip Code</Label>
          <Input id="corrections-zipCode" {...register("zipCode")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="corrections-email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-sobrietyDate">
            Sobriety Date <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-sobrietyDate" type="date" {...register("sobrietyDate")} />
          {errors.sobrietyDate && <p className="text-sm text-destructive">{errors.sobrietyDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-homeGroup">
            Home Group <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-homeGroup" {...register("homeGroup")} />
          {errors.homeGroup && <p className="text-sm text-destructive">{errors.homeGroup.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-phonePrimary">Phone Number 1</Label>
          <Input id="corrections-phonePrimary" type="tel" {...register("phonePrimary")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-phoneSecondary">Phone Number 2</Label>
          <Input id="corrections-phoneSecondary" type="tel" {...register("phoneSecondary")} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="corrections-isSpanishSpeaking"
            checked={isSpanishSpeaking}
            onCheckedChange={(checked) => setValue("isSpanishSpeaking", checked === true)}
          />
          <Label htmlFor="corrections-isSpanishSpeaking" className="font-normal cursor-pointer">
            I am Spanish-speaking.
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-otherLanguages">Other Languages Spoken</Label>
          <Input id="corrections-otherLanguages" {...register("otherLanguages")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-notes">Additional Notes</Label>
        <Textarea id="corrections-notes" className="min-h-24" {...register("notes")} />
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
          "Submit Volunteer Sign Up"
        )}
      </Button>
    </form>
  )
}

function CorrectionsTCPContent() {
  return (
    <>
      <PageHeader
        variant="featured"
        icon={Building2}
        badge="Corrections"
        title="Corrections Temporary Contact Program"
        description="Helping alcoholics transition from correctional facilities to the A.A. community."
        backLink={{ href: "/temporary-contact-programs", label: "Back to Temporary Contact Programs" }}
        ariaId="corrections-tcp-heading"
      />

      <section className="py-12 sm:py-16" aria-labelledby="contact-form-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 id="contact-form-heading" className="text-2xl font-bold text-foreground mb-4">
                Volunteer as a Temporary Contact
              </h2>
              <p className="text-muted-foreground mb-4">
                Complete this volunteer sign-up form to help people leaving correctional facilities connect with A.A.
                in their home community.
              </p>
              <p className="text-muted-foreground mb-4">
                We use this information to find the best location match and support successful first-meeting
                connections.
              </p>
              <p className="text-muted-foreground">
                You can also reach us directly at{" "}
                <Link href="mailto:ctcp@area36.org" className="text-primary hover:underline">
                  ctcp@area36.org
                </Link>
              </p>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Corrections Volunteer Sign Up</CardTitle>
                <CardDescription>
                  Required fields are marked with an asterisk. Please provide as much location detail as available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VolunteerForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="pink-can-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="max-w-2xl">
              <h2 id="pink-can-heading" className="text-2xl font-bold text-foreground mb-4">
                The Pink Can Plan
              </h2>
              <p className="text-muted-foreground mb-4">
                The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional
                facilities.
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

      <section className="py-12 sm:py-16" aria-labelledby="committee-contact-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 id="committee-contact-heading" className="text-2xl font-bold text-foreground mb-4">
              Corrections Committee
            </h2>
            <p className="text-muted-foreground mb-6">
              For more information about corrections service work in Area 36, contact the committee.
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
    </>
  )
}

export function CorrectionsTCPClient() {
  return <CorrectionsTCPContent />
}
