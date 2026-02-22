"use client"

import { useState, useTransition, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import {
  Stethoscope,
  UserPlus,
  HandHeart,
  CheckCircle,
  Shield,
  Loader2,
  ExternalLink,
  BookOpen,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  newcomerFormSchema,
  volunteerFormSchema,
  type NewcomerFormData,
  type VolunteerFormData,
} from "@/lib/schemas/treatment-tcp"
import { createTranslator } from "@/lib/content/t"
import type { ContentDoc } from "@/lib/content/schema"
import { submitNewcomerForm, submitVolunteerForm } from "./actions"

type TreatmentHeaderContent = {
  badge?: string
  title?: string
  description?: string
  secondaryDescription?: string
  backLinkLabel?: string
}

function NewcomerForm({ t }: { t: (path: string, fallback?: string) => string }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewcomerFormData>({
    resolver: zodResolver(newcomerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      age: "",
      gender: "",
      dischargeDate: "",
      city: "",
      zipCode: "",
      treatmentFacility: "",
      treatmentFacilityPhone: "",
      treatmentFacilityAddress: "",
      recaptchaToken: "",
    },
  })

  const onSubmit = useCallback(
    async (data: NewcomerFormData) => {
      setSubmitError(null)

      startTransition(async () => {
        try {
          if (!executeRecaptcha) {
            setSubmitError(
              t("forms.common.recaptchaNotLoadedError", "reCAPTCHA not loaded. Please refresh and try again."),
            )
            return
          }
          const token = await executeRecaptcha("newcomer_form")
          const result = await submitNewcomerForm({ ...data, recaptchaToken: token })

          if (result.success) {
            setSubmitted(true)
          } else {
            setSubmitError(result.error ?? t("forms.common.genericError", "An error occurred"))
          }
        } catch (error) {
          console.error("Form submission error:", error)
          setSubmitError(t("forms.common.genericRetryError", "An error occurred. Please try again."))
        }
      })
    },
    [executeRecaptcha, t],
  )

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {t("forms.newcomer.successTitle", "Request Submitted!")}
        </h3>
        <p className="mt-2 text-muted-foreground">
          {t(
            "forms.newcomer.successBody",
            "Thank you for your request. The Treatment TCP Coordinator will contact you shortly.",
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
          {t("forms.newcomer.successButtonLabel", "Submit Another Request")}
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
          <Label htmlFor="newcomer-firstName">
            {t("forms.newcomer.firstNameLabel", "First Name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newcomer-lastName">
            {t("forms.newcomer.lastNameLabel", "Last Name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-phone">
          {t("forms.newcomer.phoneLabel", "Phone")} <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-phone" type="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newcomer-age">
            {t("forms.newcomer.ageLabel", "Age")} <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-age" {...register("age")} />
          {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newcomer-gender">
            {t("forms.newcomer.genderLabel", "Gender")} <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-gender" {...register("gender")} />
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-dischargeDate">
          {t("forms.newcomer.dischargeDateLabel", "Discharge Date")} <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-dischargeDate" type="date" {...register("dischargeDate")} />
        {errors.dischargeDate && <p className="text-sm text-destructive">{errors.dischargeDate.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newcomer-city">
            {t("forms.newcomer.cityLabel", "City (after discharge)")} <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newcomer-zipCode">
            {t("forms.newcomer.zipCodeLabel", "Zip Code (after discharge)")} <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-zipCode" {...register("zipCode")} />
          {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-treatmentFacility">
          {t("forms.newcomer.treatmentFacilityLabel", "Treatment Facility")} <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-treatmentFacility" {...register("treatmentFacility")} />
        {errors.treatmentFacility && <p className="text-sm text-destructive">{errors.treatmentFacility.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-treatmentFacilityPhone">
          {t("forms.newcomer.treatmentFacilityPhoneLabel", "Treatment Facility Phone")} <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-treatmentFacilityPhone" type="tel" {...register("treatmentFacilityPhone")} />
        {errors.treatmentFacilityPhone && (
          <p className="text-sm text-destructive">{errors.treatmentFacilityPhone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-treatmentFacilityAddress">
          {t("forms.newcomer.treatmentFacilityAddressLabel", "Treatment Facility Address")} <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-treatmentFacilityAddress" {...register("treatmentFacilityAddress")} />
        {errors.treatmentFacilityAddress && (
          <p className="text-sm text-destructive">{errors.treatmentFacilityAddress.message}</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{t("forms.common.recaptchaNotice", "This form is protected by Google reCAPTCHA v3.")}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t("forms.common.submittingLabel", "Submitting...")}
          </>
        ) : (
          t("forms.newcomer.submitButtonLabel", "Submit Request")
        )}
      </Button>
    </form>
  )
}

function VolunteerForm({ t }: { t: (path: string, fallback?: string) => string }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      age: "",
      gender: "",
      city: "",
      zipCode: "",
      homeGroup: "",
      homeGroupCity: "",
      sobrietyDate: "",
      recaptchaToken: "",
    },
  })

  const onSubmit = useCallback(
    async (data: VolunteerFormData) => {
      setSubmitError(null)

      startTransition(async () => {
        try {
          if (!executeRecaptcha) {
            setSubmitError(
              t("forms.common.recaptchaNotLoadedError", "reCAPTCHA not loaded. Please refresh and try again."),
            )
            return
          }
          const token = await executeRecaptcha("volunteer_form")
          const result = await submitVolunteerForm({ ...data, recaptchaToken: token })

          if (result.success) {
            setSubmitted(true)
          } else {
            setSubmitError(result.error ?? t("forms.common.genericError", "An error occurred"))
          }
        } catch (error) {
          console.error("Form submission error:", error)
          setSubmitError(t("forms.common.genericRetryError", "An error occurred. Please try again."))
        }
      })
    },
    [executeRecaptcha, t],
  )

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {t("forms.volunteer.successTitle", "Thank You for Volunteering!")}
        </h3>
        <p className="mt-2 text-muted-foreground">
          {t(
            "forms.volunteer.successBody",
            "Your sign up has been received. The Treatment TCP Coordinator will contact you shortly.",
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
          {t("forms.volunteer.successButtonLabel", "Submit Another")}
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
          <Label htmlFor="volunteer-firstName">
            {t("forms.volunteer.firstNameLabel", "First Name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-lastName">
            {t("forms.volunteer.lastNameLabel", "Last Name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-phone">
            {t("forms.volunteer.phoneLabel", "Phone")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-phone" type="tel" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-email">
            {t("forms.volunteer.emailLabel", "Email")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-age">
            {t("forms.volunteer.ageLabel", "Age")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-age" {...register("age")} />
          {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-gender">
            {t("forms.volunteer.genderLabel", "Gender")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-gender" {...register("gender")} />
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-city">
            {t("forms.volunteer.cityLabel", "City")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-zipCode">
            {t("forms.volunteer.zipCodeLabel", "Zip Code")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-zipCode" {...register("zipCode")} />
          {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-homeGroup">
            {t("forms.volunteer.homeGroupLabel", "Home Group")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-homeGroup" {...register("homeGroup")} />
          {errors.homeGroup && <p className="text-sm text-destructive">{errors.homeGroup.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-homeGroupCity">
            {t("forms.volunteer.homeGroupCityLabel", "Home Group City")} <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-homeGroupCity" {...register("homeGroupCity")} />
          {errors.homeGroupCity && <p className="text-sm text-destructive">{errors.homeGroupCity.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="volunteer-sobrietyDate">
          {t("forms.volunteer.sobrietyDateLabel", "Sobriety Date")} <span className="text-destructive">*</span>
        </Label>
        <Input id="volunteer-sobrietyDate" type="date" {...register("sobrietyDate")} />
        {errors.sobrietyDate && <p className="text-sm text-destructive">{errors.sobrietyDate.message}</p>}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{t("forms.common.recaptchaNotice", "This form is protected by Google reCAPTCHA v3.")}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t("forms.common.submittingLabel", "Submitting...")}
          </>
        ) : (
          t("forms.volunteer.submitButtonLabel", "Sign Up to Volunteer")
        )}
      </Button>
    </form>
  )
}

function TreatmentTCPContent({
  content,
  header,
}: {
  content?: ContentDoc
  header?: TreatmentHeaderContent
}) {
  const { t } = createTranslator(content ?? {})
  const volunteerGuidelines = Array.from({ length: 10 }, (_, idx) =>
    t(`guidelines.items.${idx}`, ""),
  ).filter(Boolean)

  const treatmentCommitteesUrl = t("resources.treatmentCommittees.url", "https://www.aa.org/treatment-committees")
  const newcomerPamphletUrl = t(
    "resources.newcomerPamphlet.url",
    "https://www.aa.org/aa-temporary-contactbridging-gap-request-inside",
  )
  const volunteerPamphletUrl = t(
    "resources.volunteerPamphlet.url",
    "https://www.aa.org/aa-temporary-contactbridging-gap-volunteer-outside",
  )
  const coordinatorEmail = t("contact.coordinatorEmail", "ttcc@area36.org")
  const committeeEmail = t("contact.committeeEmail", "treatment@area36.org")

  return (
    <>
      <PageHeader
        variant="featured"
        icon={Stethoscope}
        badge={header?.badge || "Treatment"}
        title={header?.title || "Treatment Temporary Contact Program"}
        description={
          header?.description ||
          "Many A.A. members can tell you that, even though we were aware of Alcoholics Anonymous in treatment, we were too fearful to go alone. In order to bridge the gap between the treatment facility and A.A. community, A.A. members have volunteered to be temporary contacts for 30 to 90 days to introduce you to our Alcoholics Anonymous community."
        }
        secondaryDescription={
          header?.secondaryDescription ||
          "We cannot emphasize enough the importance of having a temporary contact as the essential link between treatment and recovering from alcoholism."
        }
        backLink={{ href: "/temporary-contact-programs", label: header?.backLinkLabel || "Back to Temporary Contact Programs" }}
        ariaId="treatment-tcp-heading"
      />

      <section className="py-12 sm:py-16" aria-labelledby="forms-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="forms-heading" className="sr-only">
            {t("sections.formsAriaLabel", "Sign Up Forms")}
          </h2>
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <UserPlus className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle>{t("forms.newcomer.cardTitle", "Newcomer Sign Up")}</CardTitle>
                <CardDescription>{t("forms.newcomer.cardDescription", "Request a temporary contact")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t(
                    "forms.newcomer.introParagraph1",
                    "Temporary contacts will pick you up and take you to A.A. meetings, help you find a temporary sponsor, and guide you in your early days of working the A.A. recovery program. No matter how far down the road you have traveled, you can recover from the disease of Alcoholism.",
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "forms.newcomer.introParagraph2",
                    "If you are currently in a Treatment Center, please fill out this form to request a temporary contact. The Treatment Temporary Contact Program Coordinator will reach out to you shortly.",
                  )}
                </p>
                <NewcomerForm t={t} />
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <HandHeart className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle>{t("forms.volunteer.cardTitle", "Volunteer Sign Up")}</CardTitle>
                <CardDescription>{t("forms.volunteer.cardDescription", "Become a temporary contact")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t(
                    "forms.volunteer.introParagraph1",
                    "Continuing to be of service is an integral aspect of working the A.A. recovery program. Working with newcomers also keeps the disease of alcoholism front and center, ever reminding us that we can never be cured of alcoholism and that our recovery depends upon our spiritual fitness on a daily basis.",
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "forms.volunteer.introParagraph2",
                    "If you are looking to volunteer to be a temporary contact, or you are a treatment center looking for more information, please fill out this form. The Treatment Temporary Contact Program Coordinator will reach out to you shortly.",
                  )}
                </p>
                <VolunteerForm t={t} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="guidelines-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 id="guidelines-heading" className="text-2xl font-bold text-foreground mb-2">
              {t("guidelines.title", "Volunteer Guidelines")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "guidelines.intro",
                "Your job is simple. You contact the new A.A. member and arrange to take them to an A.A. meeting, preferably within 24-48 hours of their discharge. Your commitment is taking them to as many as six meetings.",
              )}
            </p>
            <p className="text-muted-foreground mb-6">
              <strong>{t("guidelines.notePrefix", "Please note:")}</strong>{" "}
              {t(
                "guidelines.noteBody",
                'It is not intended that you become their sponsor, even temporarily. It is best if the word "sponsor" is not used to describe this type of service. The term "Temporary Contact" is preferred.',
              )}
            </p>
            <p className="text-muted-foreground mb-8">
              {t(
                "guidelines.rulesBody",
                "Volunteers need to adhere to treatment facility rules regarding contact with residents, both while they are in the facility and after they are discharged. The Treatment Temporary Contact Program Coordinator can provide the necessary information for each facility.",
              )}
            </p>

            <ol className="space-y-4">
              {volunteerGuidelines.map((guideline, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {index + 1}
                  </span>
                  <p className="text-muted-foreground pt-0.5">{guideline}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="resources-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="resources-heading" className="text-2xl font-bold text-foreground mb-6">
            {t("resources.title", "Additional Resources")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={treatmentCommitteesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {t("resources.treatmentCommittees.title", "Treatment Committees")}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label={t("resources.opensNewTabLabel", "(opens in new tab)")} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("resources.treatmentCommittees.description", "More information about the Treatment TCP on AA.org")}
                </p>
              </div>
            </Link>

            <Link
              href={newcomerPamphletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {t("resources.newcomerPamphlet.title", "Newcomer Pamphlet")}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label={t("resources.opensNewTabLabel", "(opens in new tab)")} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("resources.newcomerPamphlet.description", "Information for those requesting a contact")}
                </p>
              </div>
            </Link>

            <Link
              href={volunteerPamphletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {t("resources.volunteerPamphlet.title", "Volunteer Pamphlet")}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label={t("resources.opensNewTabLabel", "(opens in new tab)")} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("resources.volunteerPamphlet.description", "Information for volunteer temporary contacts")}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">{t("contact.title", "Questions?")}</h2>
            <p className="opacity-90 mb-6">
              {t(
                "contact.description",
                "For more information about the Treatment Temporary Contact Program, please contact the Treatment TCP Coordinator or the Treatment Committee.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href={`mailto:${coordinatorEmail}`}>{coordinatorEmail}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href={`mailto:${committeeEmail}`}>{committeeEmail}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export function TreatmentTCPClient({
  content,
  fallbackHeader,
}: {
  content?: ContentDoc
  fallbackHeader?: TreatmentHeaderContent
}) {
  return <TreatmentTCPContent content={content} header={fallbackHeader} />
}
