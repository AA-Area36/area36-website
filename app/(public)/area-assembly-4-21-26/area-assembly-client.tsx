"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { BookOpen, CalendarDays, CheckCircle, ExternalLink, Loader2, Shield, TriangleAlert, Video } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<AreaAssemblyRegistrationData>({
    resolver: zodResolver(areaAssemblyRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastInitial: "",
      attendingApril18: false,
      attendingApril18InPerson: false,
      attendingApril21: false,
      recaptchaToken: "",
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form's watch API is intentionally used for conditional fields.
  const attendingApril18 = watch("attendingApril18")

  useEffect(() => {
    if (!attendingApril18) {
      setValue("attendingApril18InPerson", false, { shouldValidate: true })
    }
  }, [attendingApril18, setValue])

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
        secondaryDescription="Registration is free. We only need your first name, last initial, and which meeting dates you plan to attend."
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
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
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

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Video className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Zoom meeting links</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Use the Zoom details for the date you plan to attend remotely.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">April 18 meeting</p>
                        <div className="mt-3">
                          <Button asChild variant="outline" className="bg-background">
                            <Link
                              href="https://us02web.zoom.us/j/84061207297?pwd=MxhQw1Op1UB3CFoDE3uaFtswECRVkN.1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open April 18 Zoom
                              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </div>
                        <p className="mt-3">
                          <span className="font-medium text-foreground">Meeting ID:</span> 840 6120 7297
                        </p>
                        <p className="mt-1">
                          <span className="font-medium text-foreground">Passcode:</span> 8PxnfN
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">April 21 meeting</p>
                        <div className="mt-3">
                          <Button asChild variant="outline" className="bg-background">
                            <Link
                              href="https://us02web.zoom.us/j/89597429191?pwd=pWpTSNhIGDlDjBlHkie8KZDMCW9Vxg.1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open April 21 Zoom
                              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </div>
                        <p className="mt-3">
                          <span className="font-medium text-foreground">Meeting ID:</span> 895 9742 9191
                        </p>
                        <p className="mt-1">
                          <span className="font-medium text-foreground">Passcode:</span> W2HgaU
                        </p>
                      </div>
                    </div>
                  </div>
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

                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Which meetings will you attend?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Select one or both dates so the committee can track attendance.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="attendingApril18"
                          checked={watch("attendingApril18")}
                          onCheckedChange={(checked) =>
                            setValue("attendingApril18", checked === true, { shouldValidate: true })
                          }
                        />
                        <Label htmlFor="attendingApril18" className="text-sm leading-relaxed text-foreground">
                          I will attend the April 18 meeting
                        </Label>
                      </div>

                      {attendingApril18 && (
                        <div className="ml-7 flex items-start gap-3">
                          <Checkbox
                            id="attendingApril18InPerson"
                            checked={watch("attendingApril18InPerson")}
                            onCheckedChange={(checked) =>
                              setValue("attendingApril18InPerson", checked === true, { shouldValidate: true })
                            }
                          />
                          <Label htmlFor="attendingApril18InPerson" className="text-sm leading-relaxed text-foreground">
                            I will be in person
                          </Label>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="attendingApril21"
                          checked={watch("attendingApril21")}
                          onCheckedChange={(checked) =>
                            setValue("attendingApril21", checked === true, { shouldValidate: true })
                          }
                        />
                        <Label htmlFor="attendingApril21" className="text-sm leading-relaxed text-foreground">
                          I will attend the April 21 meeting
                        </Label>
                      </div>

                      {(errors.attendingApril18 || errors.attendingApril18InPerson) && (
                        <p className="text-sm text-destructive">
                          {errors.attendingApril18?.message || errors.attendingApril18InPerson?.message}
                        </p>
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
