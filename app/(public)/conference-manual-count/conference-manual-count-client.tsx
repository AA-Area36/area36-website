"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { BookMarked, CalendarDays, CheckCircle, Loader2, PackageCheck, Shield, TriangleAlert } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  conferenceManualCountSchema,
  type ConferenceManualCountData,
} from "@/lib/schemas/conference-manual-count"
import { submitConferenceManualCount } from "./actions"

type SubmissionState = "form" | "success" | "error"

const canBypassRecaptcha = process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

export function ConferenceManualCountClient() {
  const [submissionState, setSubmissionState] = useState<SubmissionState>("form")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const outcomeRef = useRef<HTMLDivElement>(null)
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConferenceManualCountData>({
    resolver: zodResolver(conferenceManualCountSchema),
    defaultValues: {
      contactName: "",
      email: "",
      role: "",
      manualCount: 1,
      recaptchaToken: "",
    },
  })

  const resetForm = useCallback(() => {
    setSubmissionState("form")
    setSubmitError(null)
    reset()
  }, [reset])

  useEffect(() => {
    if (submissionState !== "form") outcomeRef.current?.focus()
  }, [submissionState])

  const onSubmit = useCallback(
    async (data: ConferenceManualCountData) => {
      setSubmitError(null)

      startTransition(async () => {
        try {
          let token = "development"
          if (!canBypassRecaptcha) {
            if (!executeRecaptcha) {
              setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
              setSubmissionState("error")
              return
            }

            token = await executeRecaptcha("conference_manual_count")
          }

          if (!token) {
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            setSubmissionState("error")
            return
          }

          const result = await submitConferenceManualCount({ ...data, recaptchaToken: token })

          if (result.success) {
            setSubmissionState("success")
            return
          }

          setSubmitError(result.error ?? "An error occurred while saving your manual count.")
          setSubmissionState("error")
        } catch (error) {
          console.error("Conference manual count error:", error)
          setSubmitError("An error occurred while saving your manual count. Please try again.")
          setSubmissionState("error")
        }
      })
    },
    [executeRecaptcha],
  )

  return (
    <>
      <PageHeader
        title="Conference Manual Count"
        description="Help Area 36 plan how many Conference Manuals to purchase this year."
        secondaryDescription="Please submit your count by June 1."
        variant="featured"
        icon={BookMarked}
        badge="Deadline: June 1"
        maxWidth="2xl"
        ariaId="conference-manual-count-heading"
      />

      <section className="pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <CalendarDays className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">Submit by June 1</h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      The count helps estimate how many Conference Manuals will be purchased by Area 36 trusted
                      servants this year.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <PackageCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">What to enter</h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Enter the number of Conference Manuals you expect to purchase. If your count changes, submit the
                      form again with the updated number.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-primary/20 shadow-lg shadow-primary/5">
              <CardHeader>
                <CardTitle>Conference Manual count</CardTitle>
                <CardDescription>Tell us how many Conference Manuals you want to purchase this year.</CardDescription>
              </CardHeader>
              <CardContent>
                {submissionState === "success" ? (
                  <div
                    ref={outcomeRef}
                    role="status"
                    aria-live="polite"
                    tabIndex={-1}
                    className="rounded-xl border border-border bg-card p-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-foreground">Manual count received</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Thank you. Your count has been added for planning.
                    </p>
                    <Button variant="outline" className="mt-6 bg-transparent" onClick={resetForm}>
                      Submit another count
                    </Button>
                  </div>
                ) : submissionState === "error" ? (
                  <div
                    ref={outcomeRef}
                    role="alert"
                    tabIndex={-1}
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <TriangleAlert className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-foreground">Manual count could not be saved</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {submitError ?? "Please try again in a moment."}
                    </p>
                    <Button variant="outline" className="mt-6 bg-transparent" onClick={resetForm}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-describedby="manual-required-note">
                    <p id="manual-required-note" className="text-sm text-muted-foreground">
                      All fields are required.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">
                        Contact name <span className="text-destructive" aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id="contactName"
                        autoComplete="name"
                        required
                        aria-invalid={!!errors.contactName}
                        aria-describedby={errors.contactName ? "contactName-error" : undefined}
                        {...register("contactName")}
                      />
                      {errors.contactName && <p id="contactName-error" className="text-sm text-destructive">{errors.contactName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive" aria-hidden="true">*</span>
                      </Label>
                      <Input id="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
                      {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">
                        Role <span className="text-destructive" aria-hidden="true">*</span>
                      </Label>
                      <Input id="role" required aria-invalid={!!errors.role} aria-describedby={errors.role ? "role-error" : undefined} {...register("role")} />
                      {errors.role && <p id="role-error" className="text-sm text-destructive">{errors.role.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manualCount">
                        Number of Conference Manuals <span className="text-destructive" aria-hidden="true">*</span>
                      </Label>
                      <Input id="manualCount" type="number" min={1} inputMode="numeric" required aria-invalid={!!errors.manualCount} aria-describedby={errors.manualCount ? "manualCount-error" : undefined} {...register("manualCount")} />
                      {errors.manualCount && <p id="manualCount-error" className="text-sm text-destructive">{errors.manualCount.message}</p>}
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
                        "Submit manual count"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
