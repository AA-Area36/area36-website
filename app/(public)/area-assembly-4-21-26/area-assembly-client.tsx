"use client"

import { useCallback, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { BookOpen, CalendarDays, CheckCircle, ExternalLink, Loader2, MapPin, Shield, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  areaAssemblyRegistrationSchema,
  type AreaAssemblyRegistrationData,
} from "@/lib/schemas/area-assembly-registration"
import { submitAreaAssemblyRegistration } from "./actions"

type SubmissionState = "form" | "success" | "error"

export function AreaAssemblyClient() {
  const [submissionState, setSubmissionState] = useState<SubmissionState>("form")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AreaAssemblyRegistrationData>({
    resolver: zodResolver(areaAssemblyRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastInitial: "",
      recaptchaToken: "",
    },
  })

  const resetForm = useCallback(() => {
    setSubmissionState("form")
    setSubmitError(null)
    reset()
  }, [reset])

  const onSubmit = useCallback(
    async (data: AreaAssemblyRegistrationData) => {
      setSubmitError(null)

      startTransition(async () => {
        try {
          if (!executeRecaptcha) {
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            setSubmissionState("error")
            return
          }

          const token = await executeRecaptcha("area_assembly_registration")
          const result = await submitAreaAssemblyRegistration({ ...data, recaptchaToken: token })

          if (result.success) {
            setSubmissionState("success")
            return
          }

          setSubmitError(result.error ?? "An error occurred while saving your registration.")
          setSubmissionState("error")
        } catch (error) {
          console.error("Area assembly registration error:", error)
          setSubmitError("An error occurred while saving your registration. Please try again.")
          setSubmissionState("error")
        }
      })
    },
    [executeRecaptcha],
  )

  return (
    <>
      <PageHeader
        title="Area Assembly / Delegates Workshop"
        description="Register so we can plan food for the workshop and share the background material with attendees in one place."
        secondaryDescription="Registration is free. We only need your first name and last initial."
        variant="featured"
        icon={CalendarDays}
        badge="Workshop Registration"
        maxWidth="2xl"
        ariaId="area-assembly-registration-heading"
      />

      <section className="pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Conference background material</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Review the agenda item background information before the workshop. This link opens the existing General Service Conference background-material section.
                      </p>
                    </div>
                    <Button asChild variant="outline" className="bg-background">
                      <Link href="/general-service-conference#background-heading">
                        Open background material
                        <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-foreground">
                    <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold">Bring the flyer details here</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    This page is ready to be linked from a QR code once the flyer time and location details are finalized.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-foreground">
                    <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold">Simple RSVP only</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    The form keeps the ask minimal so members can register quickly while still giving the workshop team a food headcount.
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-primary/20 shadow-lg shadow-primary/5">
              <CardHeader>
                <CardTitle>Register for the workshop</CardTitle>
                <CardDescription>
                  Add your first name and last initial so the committee has an estimated headcount.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionState === "success" ? (
                  <div className="rounded-xl border border-border bg-card p-2 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-foreground">Registration received</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Thank you. Your registration has been added and the workshop team can include you in the food count.
                    </p>
                    <Button variant="outline" className="mt-6 bg-transparent" onClick={resetForm}>
                      Register another person
                    </Button>
                  </div>
                ) : submissionState === "error" ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <TriangleAlert className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-foreground">Registration could not be saved</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {submitError ?? "Please try again in a moment."}
                    </p>
                    <Button variant="outline" className="mt-6 bg-transparent" onClick={resetForm}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First name <span className="text-destructive">*</span>
                      </Label>
                      <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
                      {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastInitial">
                        Last initial <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastInitial"
                        autoCapitalize="characters"
                        maxLength={1}
                        className="uppercase"
                        {...register("lastInitial")}
                      />
                      {errors.lastInitial && <p className="text-sm text-destructive">{errors.lastInitial.message}</p>}
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
                        "Submit registration"
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
