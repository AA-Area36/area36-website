"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { CheckCircle2, ClipboardCheck, Loader2, LockKeyhole, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { districtOptions } from "@/lib/constants/districts"
import { NEWSLETTER_DELIVERY_OPTIONS, SERVICE_POSITION_OPTIONS } from "@/lib/quorum/constants"
import type { PublicQuorumEvent } from "@/lib/quorum/types"
import { quorumRegistrationSchema, type QuorumRegistrationInput } from "@/lib/schemas/quorum"
import { submitQuorumRegistration } from "./actions"

export function QuorumCheckInClient({ event }: { event: PublicQuorumEvent }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { executeRecaptcha } = useGoogleReCaptcha()
  const form = useForm<QuorumRegistrationInput>({
    resolver: zodResolver(quorumRegistrationSchema),
    defaultValues: {
      name: "",
      district: "dont_know",
      homeGroup: "",
      servicePosition: "general_member",
      positionDetail: "",
      representation: "primary",
      email: "",
      phone: "",
      streetAddress: "",
      city: "",
      state: "MN",
      zip: "",
      recaptchaToken: "",
    },
  })
  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch drives conditional role fields.
  const servicePosition = form.watch("servicePosition")
  const needsPositionDetail = servicePosition === "area_officer" || servicePosition === "area_committee_chair"
  const eventDate = useMemo(
    () => new Date(`${event.eventDate}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    [event.eventDate],
  )

  const onSubmit = form.handleSubmit((data) => {
    setSubmitError(null)
    startTransition(async () => {
      try {
        const token = executeRecaptcha ? await executeRecaptcha("quorum_check_in") : "development"
        const result = await submitQuorumRegistration(event.eventKey, { ...data, recaptchaToken: token })
        if (result.success) {
          setSubmitted(true)
          form.reset()
        } else {
          setSubmitError(result.error)
        }
      } catch {
        setSubmitError("We could not save your check-in. Please try again.")
      }
    })
  })

  if (submitted) {
    return (
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_48%)]" />
        <div className="relative mx-auto max-w-xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">You’re checked in</h1>
          <p className="mt-3 text-muted-foreground">Your attendance has been recorded for {event.title}.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href={`/quorum/${event.eventKey}/dashboard`}>View quorum dashboard</Link>
            </Button>
            <Button variant="outline" onClick={() => setSubmitted(false)}>Check in another attendee</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(135deg,_hsl(var(--primary)/0.16),_transparent_55%)]" />
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Area 36 event check-in
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{event.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{eventDate}</p>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <Card className="border-primary/15 shadow-xl shadow-primary/5">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Attendance information</CardTitle>
            <CardDescription>Required fields help Area 36 verify voting representation and maintain service records.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {event.status === "closed" ? (
              <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
                <LockKeyhole className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="mt-4 text-xl font-semibold">Check-in is closed</h2>
                <Button asChild variant="outline" className="mt-6">
                  <Link href={`/quorum/${event.eventKey}/dashboard`}>View final quorum</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-8">
                <FormSection number="01" title="Service representation">
                  <Field id="quorum-name" label="First and last name" error={form.formState.errors.name?.message}>
                    <Input id="quorum-name" autoComplete="name" {...form.register("name")} />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="quorum-district" label="District" error={form.formState.errors.district?.message}>
                      <Controller
                        control={form.control}
                        name="district"
                        render={({ field }) => (
                          <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="quorum-district" className="h-10 w-full" onBlur={field.onBlur} aria-invalid={!!form.formState.errors.district}>
                              <SelectValue placeholder="Choose a district" />
                            </SelectTrigger>
                            <SelectContent>
                              {districtOptions.map((district) => <SelectItem key={district.value} value={district.value}>{district.label}</SelectItem>)}
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="dont_know">Don’t know</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                    <Field id="quorum-home-group" label="Home group" error={form.formState.errors.homeGroup?.message}>
                      <Input id="quorum-home-group" {...form.register("homeGroup")} />
                    </Field>
                  </div>
                  <Field id="quorum-service-position" label="Service position" error={form.formState.errors.servicePosition?.message}>
                    <Controller
                      control={form.control}
                      name="servicePosition"
                      render={({ field }) => (
                        <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="quorum-service-position" className="h-10 w-full" onBlur={field.onBlur} aria-invalid={!!form.formState.errors.servicePosition}>
                            <SelectValue placeholder="Choose a service position" />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_POSITION_OPTIONS.map((position) => <SelectItem key={position.value} value={position.value}>{position.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  {needsPositionDetail && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        id="quorum-position-detail"
                        label={servicePosition === "area_officer" ? "Area office" : "Committee name"}
                        error={form.formState.errors.positionDetail?.message}
                      >
                        <Input id="quorum-position-detail" {...form.register("positionDetail")} />
                      </Field>
                      <Field id="quorum-representation" label="Representation" error={form.formState.errors.representation?.message}>
                        <Controller
                          control={form.control}
                          name="representation"
                          render={({ field }) => (
                            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id="quorum-representation" className="h-10 w-full" onBlur={field.onBlur} aria-invalid={!!form.formState.errors.representation}>
                                <SelectValue placeholder="Choose representation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="alternate">Alternate for an absent primary</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>
                    </div>
                  )}
                </FormSection>

                <FormSection number="02" title="Contact information">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="quorum-email" label="Personal email" error={form.formState.errors.email?.message}>
                      <Input id="quorum-email" type="email" autoComplete="email" {...form.register("email")} />
                    </Field>
                    <Field id="quorum-phone" label="Phone number" error={form.formState.errors.phone?.message}>
                      <Input id="quorum-phone" type="tel" autoComplete="tel" {...form.register("phone")} />
                    </Field>
                  </div>
                  <Field id="quorum-street-address" label="Street address" error={form.formState.errors.streetAddress?.message}>
                    <Input id="quorum-street-address" autoComplete="street-address" {...form.register("streetAddress")} />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-[1fr_120px_140px]">
                    <Field id="quorum-city" label="City" error={form.formState.errors.city?.message}>
                      <Input id="quorum-city" autoComplete="address-level2" {...form.register("city")} />
                    </Field>
                    <Field id="quorum-state" label="State" error={form.formState.errors.state?.message}>
                      <Input id="quorum-state" autoComplete="address-level1" {...form.register("state")} />
                    </Field>
                    <Field id="quorum-zip" label="ZIP" error={form.formState.errors.zip?.message}>
                      <Input id="quorum-zip" inputMode="numeric" autoComplete="postal-code" {...form.register("zip")} />
                    </Field>
                  </div>
                </FormSection>

                <FormSection number="03" title="The Pigeon newsletter">
                  <p className="-mt-2 text-sm leading-6 text-muted-foreground">
                    Choose how you would like to receive Area 36’s newsletter.
                  </p>
                  <Field id="quorum-newsletter-delivery" label="Newsletter delivery" error={form.formState.errors.newsletterDelivery?.message}>
                    <Controller
                      control={form.control}
                      name="newsletterDelivery"
                      render={({ field }) => (
                        <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="quorum-newsletter-delivery" className="h-10 w-full" onBlur={field.onBlur} aria-invalid={!!form.formState.errors.newsletterDelivery}>
                            <SelectValue placeholder="Choose a delivery option" />
                          </SelectTrigger>
                          <SelectContent>
                            {NEWSLETTER_DELIVERY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </FormSection>

                {submitError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{submitError}</div>}
                <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving check-in…</> : "Complete check-in"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-6">
            <UsersRound className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Why we collect this</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your service role is used to calculate quorum. Contact information is retained in the private event spreadsheet for Area 36 service records.</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground"><LockKeyhole className="h-4 w-4 text-primary" />Private details</div>
            <p className="mt-2 leading-6">Names and contact details never appear on the public quorum dashboard.</p>
          </div>
        </aside>
      </section>
    </div>
  )
}

function FormSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <fieldset className="space-y-5"><legend className="mb-5 flex items-center gap-3 text-lg font-semibold"><span className="font-mono text-xs tracking-widest text-primary">{number}</span>{title}</legend>{children}</fieldset>
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label} <span className="text-destructive">*</span></Label>{children}{error && <p className="text-sm text-destructive">{error}</p>}</div>
}
