"use client"

import { useState, useTransition, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Stethoscope,
  ArrowLeft,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  newcomerFormSchema,
  volunteerFormSchema,
  type NewcomerFormData,
  type VolunteerFormData,
} from "@/lib/schemas/treatment-tcp"
import { submitNewcomerForm, submitVolunteerForm } from "./actions"

const volunteerGuidelines = [
  "Remember you may be the first outside member of A.A. the contact meets. As such, you are representing all of us. It is important to be relaxed, friendly and interested.",
  "Keep the general conversation related to recovery. Avoid discussing the new member's discharge. We have no opinion on outside issues.",
  "Take time to introduce the new person to as many A.A. members as possible. Do not, however, push your contact. Some people are very shy.",
  "Invite them to the 'meeting after the meeting' if there is one. Show them we are happy, joyous and free and that sobriety can be enjoyable.",
  "Your commitment is usually finished after attending six meetings or as soon as a sponsor has been located. Use good recovery related judgment about when to end the relationship.",
  "Make sure the newly released A.A. member receives meeting schedules, phone numbers and A.A. literature.",
  "Encourage the new member to attend meetings as often as possible, to find a home group and to get a sponsor as soon as possible. Let them know even a temporary sponsor now would be acceptable.",
  "Share your experience, strength and hope with the newly discharged member, just as you would anyone else new to A.A. in your community.",
  "Be familiar with the suggestions of the Treatment Temporary Contact Program contained in the pamphlet. We don't offer or imply any other service and assistance unless we personally want to provide it.",
  "Please respect the complete anonymity of the new member.",
]

function NewcomerForm() {
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
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            return
          }
          const token = await executeRecaptcha("newcomer_form")
          const result = await submitNewcomerForm({ ...data, recaptchaToken: token })

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
          Thank you for your request. The Treatment TCP Coordinator will contact you shortly.
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
          <Label htmlFor="newcomer-firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newcomer-lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-phone">
          Phone <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-phone" type="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newcomer-age">
            Age <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-age" {...register("age")} />
          {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newcomer-gender">
            Gender <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-gender" {...register("gender")} />
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-dischargeDate">
          Discharge Date <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-dischargeDate" type="date" {...register("dischargeDate")} />
        {errors.dischargeDate && <p className="text-sm text-destructive">{errors.dischargeDate.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newcomer-city">
            City (after discharge) <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newcomer-zipCode">
            Zip Code (after discharge) <span className="text-destructive">*</span>
          </Label>
          <Input id="newcomer-zipCode" {...register("zipCode")} />
          {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-treatmentFacility">
          Treatment Facility <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-treatmentFacility" {...register("treatmentFacility")} />
        {errors.treatmentFacility && <p className="text-sm text-destructive">{errors.treatmentFacility.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-treatmentFacilityPhone">
          Treatment Facility Phone <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-treatmentFacilityPhone" type="tel" {...register("treatmentFacilityPhone")} />
        {errors.treatmentFacilityPhone && (
          <p className="text-sm text-destructive">{errors.treatmentFacilityPhone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newcomer-treatmentFacilityAddress">
          Treatment Facility Address <span className="text-destructive">*</span>
        </Label>
        <Input id="newcomer-treatmentFacilityAddress" {...register("treatmentFacilityAddress")} />
        {errors.treatmentFacilityAddress && (
          <p className="text-sm text-destructive">{errors.treatmentFacilityAddress.message}</p>
        )}
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

function VolunteerForm() {
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
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            return
          }
          const token = await executeRecaptcha("volunteer_form")
          const result = await submitVolunteerForm({ ...data, recaptchaToken: token })

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
        <h3 className="mt-4 text-lg font-semibold text-foreground">Thank You for Volunteering!</h3>
        <p className="mt-2 text-muted-foreground">
          Your sign up has been received. The Treatment TCP Coordinator will contact you shortly.
        </p>
        <Button
          variant="outline"
          className="mt-6 bg-transparent"
          onClick={() => {
            setSubmitted(false)
            reset()
          }}
        >
          Submit Another
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
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-phone" type="tel" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-age">
            Age <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-age" {...register("age")} />
          {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-gender">
            Gender <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-gender" {...register("gender")} />
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-city">
            City <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-city" {...register("city")} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-zipCode">
            Zip Code <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-zipCode" {...register("zipCode")} />
          {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volunteer-homeGroup">
            Home Group <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-homeGroup" {...register("homeGroup")} />
          {errors.homeGroup && <p className="text-sm text-destructive">{errors.homeGroup.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-homeGroupCity">
            Home Group City <span className="text-destructive">*</span>
          </Label>
          <Input id="volunteer-homeGroupCity" {...register("homeGroupCity")} />
          {errors.homeGroupCity && <p className="text-sm text-destructive">{errors.homeGroupCity.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="volunteer-sobrietyDate">
          Sobriety Date <span className="text-destructive">*</span>
        </Label>
        <Input id="volunteer-sobrietyDate" type="date" {...register("sobrietyDate")} />
        {errors.sobrietyDate && <p className="text-sm text-destructive">{errors.sobrietyDate.message}</p>}
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
          "Sign Up to Volunteer"
        )}
      </Button>
    </form>
  )
}

function TreatmentTCPContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="treatment-tcp-heading"
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
                  <Stethoscope className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Treatment</span>
              </div>
              <h1 id="treatment-tcp-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                Treatment Temporary Contact Program
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Many A.A. members can tell you that, even though we were aware of Alcoholics Anonymous in treatment, we
                were too fearful to go alone. In order to bridge the gap between the treatment facility and A.A.
                community, A.A. members have volunteered to be temporary contacts for 30 to 90 days to introduce you to
                our Alcoholics Anonymous community.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We cannot emphasize enough the importance of having a temporary contact as the essential link between
                treatment and recovering from alcoholism.
              </p>
            </div>
          </div>
        </section>

        {/* Two Paths / Forms */}
        <section className="py-12 sm:py-16" aria-labelledby="forms-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="forms-heading" className="sr-only">
              Sign Up Forms
            </h2>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Newcomer Form */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <UserPlus className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Newcomer Sign Up</CardTitle>
                  <CardDescription>Request a temporary contact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Temporary contacts will pick you up and take you to A.A. meetings, help you find a temporary
                    sponsor, and guide you in your early days of working the A.A. recovery program. No matter how far
                    down the road you have traveled, you can recover from the disease of Alcoholism.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    If you are currently in a Treatment Center, please fill out this form to request a temporary
                    contact. The Treatment Temporary Contact Program Coordinator will reach out to you shortly.
                  </p>
                  <NewcomerForm />
                </CardContent>
              </Card>

              {/* Volunteer Form */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <HandHeart className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Volunteer Sign Up</CardTitle>
                  <CardDescription>Become a temporary contact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Continuing to be of service is an integral aspect of working the A.A. recovery program. Working with
                    newcomers also keeps the disease of alcoholism front and center, ever reminding us that we can never
                    be cured of alcoholism and that our recovery depends upon our spiritual fitness on a daily basis.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    If you are looking to volunteer to be a temporary contact, or you are a treatment center looking for
                    more information, please fill out this form. The Treatment Temporary Contact Program Coordinator
                    will reach out to you shortly.
                  </p>
                  <VolunteerForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Volunteer Guidelines */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="guidelines-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 id="guidelines-heading" className="text-2xl font-bold text-foreground mb-2">
                Volunteer Guidelines
              </h2>
              <p className="text-muted-foreground mb-6">
                Your job is simple. You contact the new A.A. member and arrange to take them to an A.A. meeting,
                preferably within 24-48 hours of their discharge. Your commitment is taking them to as many as six
                meetings.
              </p>
              <p className="text-muted-foreground mb-6">
                <strong>Please note:</strong> It is not intended that you become their sponsor, even temporarily. It is
                best if the word &quot;sponsor&quot; is not used to describe this type of service. The term
                &quot;Temporary Contact&quot; is preferred.
              </p>
              <p className="text-muted-foreground mb-8">
                Volunteers need to adhere to treatment facility rules regarding contact with residents, both while they
                are in the facility and after they are discharged. The Treatment Temporary Contact Program Coordinator
                can provide the necessary information for each facility.
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

        {/* Additional Resources */}
        <section className="py-12 sm:py-16" aria-labelledby="resources-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="resources-heading" className="text-2xl font-bold text-foreground mb-6">
              Additional Resources
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="https://www.aa.org/treatment-committees"
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
                      Treatment Committees
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label="(opens in new tab)" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    More information about the Treatment TCP on AA.org
                  </p>
                </div>
              </Link>

              <Link
                href="https://www.aa.org/aa-temporary-contactbridging-gap-request-inside"
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
                      Newcomer Pamphlet
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label="(opens in new tab)" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Information for those requesting a contact</p>
                </div>
              </Link>

              <Link
                href="https://www.aa.org/aa-temporary-contactbridging-gap-volunteer-outside"
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
                      Volunteer Pamphlet
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label="(opens in new tab)" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Information for volunteer temporary contacts</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="opacity-90 mb-6">
                For more information about the Treatment Temporary Contact Program, please contact the Treatment TCP
                Coordinator or the Treatment Committee.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild variant="secondary">
                  <Link href="mailto:ttcc@area36.org">ttcc@area36.org</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
                >
                  <Link href="mailto:treatment@area36.org">treatment@area36.org</Link>
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

export default function TreatmentTCPPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!siteKey) {
    return <TreatmentTCPContent />
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <TreatmentTCPContent />
    </GoogleReCaptchaProvider>
  )
}
