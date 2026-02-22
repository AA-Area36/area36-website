"use client"

import { useState, useTransition, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { correctionsContactFormSchema, type CorrectionsContactFormData } from "@/lib/schemas/corrections-tcp"
import { createTranslator } from "@/lib/content/t"
import type { ContentDoc } from "@/lib/content/schema"
import { submitCorrectionsContactForm } from "./actions"

type CorrectionsHeaderContent = {
  badge?: string
  title?: string
  description?: string
  backLinkLabel?: string
}

function VolunteerForm({ t }: { t: (path: string, fallback?: string) => string }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    control,
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
      gender: undefined,
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
            setSubmitError(t("form.recaptchaNotLoadedError", "reCAPTCHA not loaded. Please refresh and try again."))
            return
          }
          const token = await executeRecaptcha("corrections_volunteer_form")
          const result = await submitCorrectionsContactForm({ ...data, recaptchaToken: token })

          if (result.success) {
            setSubmitted(true)
          } else {
            setSubmitError(result.error ?? t("form.genericError", "An error occurred"))
          }
        } catch (error) {
          console.error("Form submission error:", error)
          setSubmitError(t("form.genericError", "An error occurred"))
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
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {t("form.successTitle", "Volunteer Sign Up Received")}
        </h3>
        <p className="mt-2 text-muted-foreground">
          {t(
            "form.successBody",
            "Thank you for volunteering. The Corrections TCP Coordinator will contact you soon.",
          )}
        </p>
        <Button
          variant="outline"
          className="mt-6 bg-transparent"
          onClick={() => {
            setSubmitted(false)
            reset()
          }}
        >
          {t("form.successButtonLabel", "Submit Another Volunteer")}
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
            {t("form.firstNameLabel", "First Name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-lastName">
            {t("form.lastNameLabel", "Last Name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-gender">
            {t("form.genderLabel", "Gender")} <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                }}
              >
                <SelectTrigger id="corrections-gender" className="w-full" aria-invalid={!!errors.gender}>
                  <SelectValue placeholder={t("form.genderPlaceholder", "Select gender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">{t("form.genderMale", "Male")}</SelectItem>
                  <SelectItem value="Female">{t("form.genderFemale", "Female")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-birthYear">
            {t("form.birthYearLabel", "Birth Year")} <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-birthYear" inputMode="numeric" maxLength={4} {...register("birthYear")} />
          {errors.birthYear && <p className="text-sm text-destructive">{errors.birthYear.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-streetAddress">{t("form.streetAddressLabel", "Street Address")}</Label>
        <Input id="corrections-streetAddress" {...register("streetAddress")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-city">
            {t("form.cityLabel", "City")} <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-county">{t("form.countyLabel", "County")}</Label>
          <Input id="corrections-county" {...register("county")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-state">{t("form.stateLabel", "State")}</Label>
          <Input id="corrections-state" {...register("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-zipCode">{t("form.zipCodeLabel", "Zip Code")}</Label>
          <Input id="corrections-zipCode" {...register("zipCode")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-email">
          {t("form.emailLabel", "Email")} <span className="text-destructive">*</span>
        </Label>
        <Input id="corrections-email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-sobrietyDate">
            {t("form.sobrietyDateLabel", "Sobriety Date")} <span className="text-destructive">*</span>
          </Label>
          <Input id="corrections-sobrietyDate" type="date" {...register("sobrietyDate")} />
          {errors.sobrietyDate && <p className="text-sm text-destructive">{errors.sobrietyDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-homeGroup">{t("form.homeGroupLabel", "Home Group")}</Label>
          <Input id="corrections-homeGroup" {...register("homeGroup")} />
          {errors.homeGroup && <p className="text-sm text-destructive">{errors.homeGroup.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corrections-phonePrimary">{t("form.phonePrimaryLabel", "Phone Number 1")}</Label>
          <Input id="corrections-phonePrimary" type="tel" {...register("phonePrimary")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-phoneSecondary">{t("form.phoneSecondaryLabel", "Phone Number 2")}</Label>
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
            {t("form.spanishSpeakingLabel", "I am Spanish-speaking.")}
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrections-otherLanguages">
            {t("form.otherLanguagesLabel", "Other Languages Spoken")}
          </Label>
          <Input id="corrections-otherLanguages" {...register("otherLanguages")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corrections-notes">{t("form.notesLabel", "Additional Notes")}</Label>
        <Textarea id="corrections-notes" className="min-h-24" {...register("notes")} />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{t("form.recaptchaNotice", "This form is protected by Google reCAPTCHA v3.")}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t("form.submittingLabel", "Submitting...")}
          </>
        ) : (
          t("form.submitLabel", "Submit Volunteer Sign Up")
        )}
      </Button>
    </form>
  )
}

function CorrectionsTCPContent({
  header,
  content,
}: {
  header?: CorrectionsHeaderContent
  content?: ContentDoc
}) {
  const { t } = createTranslator(content ?? {})
  return (
    <>
      <PageHeader
        variant="featured"
        icon={Building2}
        badge={header?.badge || "Corrections"}
        title={header?.title || "Corrections Temporary Contact Program"}
        description={header?.description || "Helping alcoholics transition from correctional facilities to the A.A. community."}
        backLink={{ href: "/temporary-contact-programs", label: header?.backLinkLabel || "Back to Temporary Contact Programs" }}
        ariaId="corrections-tcp-heading"
      />

      <section className="py-12 sm:py-16" aria-labelledby="contact-form-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 id="contact-form-heading" className="text-2xl font-bold text-foreground mb-4">
                {t("page.volunteerHeading", "Volunteer as a Temporary Contact")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t(
                  "page.volunteerIntro1",
                  "Complete this volunteer sign-up form to help people leaving correctional facilities connect with A.A. in their home community.",
                )}
              </p>
              <p className="text-muted-foreground mb-4">
                {t(
                  "page.volunteerIntro2",
                  "We use this information to find the best location match and support successful first-meeting connections.",
                )}
              </p>
              <p className="text-muted-foreground">
                {t("page.volunteerIntro3", "You can also reach us directly at")}{" "}
                <Link href="mailto:ctcp@area36.org" className="text-primary hover:underline">
                  ctcp@area36.org
                </Link>
              </p>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>{t("page.formCardTitle", "Corrections Volunteer Sign Up")}</CardTitle>
                <CardDescription>
                  {t(
                    "page.formCardDescription",
                    "Required fields are marked with an asterisk. Please provide as much location detail as available.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VolunteerForm t={t} />
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
                {t("pinkCan.title", "The Pink Can Plan")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t(
                  "pinkCan.body1",
                  "The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional facilities.",
                )}
              </p>
              <p className="text-muted-foreground mb-6">
                {t(
                  "pinkCan.body2",
                  "To learn more or contribute to the Pink Can Plan, contact the Pink Can Coordinator.",
                )}
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
              {t("committee.title", "Corrections Committee")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "committee.description",
                "For more information about corrections service work in Area 36, contact the committee.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link href="mailto:corrections@area36.org">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("committee.emailButtonLabel", "corrections@area36.org")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/committees">{t("committee.committeesButtonLabel", "View All Committees")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export function CorrectionsTCPClient({
  content,
  fallbackHeader,
}: {
  content?: ContentDoc
  fallbackHeader?: CorrectionsHeaderContent
}) {
  return <CorrectionsTCPContent content={content} header={fallbackHeader} />
}
