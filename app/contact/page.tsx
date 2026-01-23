"use client"

import { useState, useTransition, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail, MapPin, Send, CheckCircle, Shield, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { contactFormSchema, type ContactFormData } from "@/lib/schemas/contact"
import { submitContactForm } from "./actions"

const recipients = [
  { value: "general", label: "General Inquiry", email: "chairperson@area36.org" },
  { value: "chairperson", label: "Area Chairperson", email: "chairperson@area36.org" },
  { value: "delegate", label: "Delegate", email: "delegate@area36.org" },
  { value: "treasurer", label: "Treasurer", email: "treasurer@area36.org" },
  { value: "secretary", label: "Secretary", email: "secretary@area36.org" },
  { value: "webmaster", label: "Website / Technical", email: "webmaster@area36.org" },
  { value: "accessibility", label: "Accessibility Committee", email: "accessibility@area36.org" },
  { value: "archives", label: "Archives Committee", email: "archives@area36.org" },
  { value: "cpc", label: "CPC Committee", email: "cpc@area36.org" },
  { value: "corrections", label: "Corrections Committee", email: "corrections@area36.org" },
  { value: "grapevine", label: "Grapevine Committee", email: "grapevine@area36.org" },
  { value: "literature", label: "Literature Committee", email: "literature@area36.org" },
  { value: "pi", label: "Public Information Committee", email: "pi@area36.org" },
  { value: "treatment", label: "Treatment Committee", email: "treatment@area36.org" },
]

const officers = [
  { role: "Delegate", email: "delegate@area36.org", description: "GSC representative" },
  { role: "Alternate Delegate", email: "altdelegate@area36.org", description: "Assists Delegate" },
  { role: "Chairperson", email: "chairperson@area36.org", description: "Area leadership" },
  { role: "Alternate Chair", email: "altchairperson@area36.org", description: "Assists Chair" },
  { role: "Secretary", email: "secretary@area36.org", description: "Area records" },
  { role: "Treasurer", email: "treasurer@area36.org", description: "Financial matters" },
]

const committees = [
  { name: "Accessibility", email: "accessibility@area36.org" },
  { name: "Archives", email: "archives@area36.org" },
  { name: "CPC", email: "cpc@area36.org" },
  { name: "Corrections", email: "corrections@area36.org" },
  { name: "Grapevine / La Viña", email: "grapevine@area36.org" },
  { name: "Group Records", email: "grouprecords@area36.org" },
  { name: "Literature", email: "literature@area36.org" },
  { name: "Public Information", email: "pi@area36.org" },
  { name: "Treatment", email: "treatment@area36.org" },
  { name: "Website", email: "webmaster@area36.org" },
]

export default function ContactPage() {
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
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      recipient: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      consent: false as unknown as true,
      recaptchaToken: "",
    },
  })

  const selectedRecipient = watch("recipient")

  const onSubmit = useCallback(async (data: ContactFormData) => {
    setSubmitError(null)

    const isDev = process.env.NODE_ENV === "development"

    startTransition(async () => {
      try {
        // Skip reCAPTCHA in development, execute in production
        let token = "dev-bypass"
        if (!isDev) {
          if (!executeRecaptcha) {
            setSubmitError("reCAPTCHA not loaded. Please refresh and try again.")
            return
          }
          token = await executeRecaptcha("contact_form")
        }
        
        // Submit form with token
        const result = await submitContactForm({ ...data, recaptchaToken: token })

        if (result.success) {
          setSubmitted(true)
        } else {
          setSubmitError(result.error ?? "An error occurred")
        }
      } catch {
        setSubmitError("reCAPTCHA verification failed. Please try again.")
      }
    })
  }, [executeRecaptcha])

  const handleSendAnother = () => {
    setSubmitted(false)
    setSubmitError(null)
    reset()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="contact-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 id="contact-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              Contact Us
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Have questions about Area 36 or general service? Select who you&apos;d like to contact and send us a
              message.
            </p>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Form */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">Send a Message</h2>

                {submitted ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">Message Sent!</h3>
                    <p className="mt-2 text-muted-foreground">
                      Thank you for your message. The{" "}
                      {recipients.find((r) => r.value === selectedRecipient)?.label || "recipient"} will get back to you
                      soon.
                    </p>
                    <Button variant="outline" className="mt-6 bg-transparent" onClick={handleSendAnother}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {submitError && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {submitError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="recipient">
                        Who would you like to contact? <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={selectedRecipient}
                        onValueChange={(value) => setValue("recipient", value, { shouldValidate: true })}
                      >
                        <SelectTrigger id="recipient">
                          <SelectValue placeholder="Select a recipient" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipients.map((recipient) => (
                            <SelectItem key={recipient.value} value={recipient.value}>
                              {recipient.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.recipient && (
                        <p className="text-sm text-destructive">{errors.recipient.message}</p>
                      )}
                      {selectedRecipient && (
                        <p className="text-sm text-muted-foreground">
                          Your message will be sent to: {recipients.find((r) => r.value === selectedRecipient)?.email}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input id="firstName" {...register("firstName")} />
                        {errors.firstName && (
                          <p className="text-sm text-destructive">{errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">
                          Last Name <span className="text-destructive">*</span>
                        </Label>
                        <Input id="lastName" {...register("lastName")} />
                        {errors.lastName && (
                          <p className="text-sm text-destructive">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" {...register("phone")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">
                        Subject <span className="text-destructive">*</span>
                      </Label>
                      <Input id="subject" placeholder="Brief subject line" {...register("subject")} />
                      {errors.subject && (
                        <p className="text-sm text-destructive">{errors.subject.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <Textarea id="message" rows={5} className="resize-none" {...register("message")} />
                      {errors.message && (
                        <p className="text-sm text-destructive">{errors.message.message}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span>This form is protected by Google reCAPTCHA v3.</span>
                      </div>
                      {errors.recaptchaToken && (
                        <p className="text-sm text-destructive mt-2">{errors.recaptchaToken.message}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="consent"
                        checked={watch("consent")}
                        onCheckedChange={(checked) =>
                          setValue("consent", checked === true ? true : (false as unknown as true), { shouldValidate: true })
                        }
                      />
                      <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed">
                        I understand that A.A. is a program of anonymity and that my contact information will be kept
                        confidential.
                      </Label>
                    </div>
                    {errors.consent && (
                      <p className="text-sm text-destructive">{errors.consent.message}</p>
                    )}

                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                {/* Mailing Address */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Mailing Address</h3>
                      <address className="mt-2 text-muted-foreground not-italic leading-relaxed">
                        SMAA
                        <br />
                        P.O. Box 2812
                        <br />
                        Minneapolis, MN 55402
                      </address>
                    </div>
                  </div>
                </div>

                {/* Direct Contacts */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-4">Direct Email Contacts</h3>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="officers" className="border-b-0">
                          <AccordionTrigger className="py-3 hover:no-underline">
                            <span className="text-sm font-medium">Area Officers</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-2 pl-1">
                              {officers.map((officer) => (
                                <li
                                  key={officer.role}
                                  className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                                >
                                  <div>
                                    <span className="font-medium text-foreground">{officer.role}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">({officer.description})</span>
                                  </div>
                                  <Link href={`mailto:${officer.email}`} className="text-primary hover:underline">
                                    {officer.email}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="committees" className="border-b-0">
                          <AccordionTrigger className="py-3 hover:no-underline">
                            <span className="text-sm font-medium">Committee Chairs</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-2 pl-1">
                              {committees.map((committee) => (
                                <li
                                  key={committee.name}
                                  className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                                >
                                  <span className="font-medium text-foreground">{committee.name}</span>
                                  <Link href={`mailto:${committee.email}`} className="text-primary hover:underline">
                                    {committee.email}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                </div>

                {/* Need Immediate Help */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Need Immediate Help?</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                    If you or someone you know is struggling with alcohol, the most important thing is to find a
                    meeting.
                  </p>
                  <Button asChild variant="outline" className="bg-transparent border-amber-300 dark:border-amber-700">
                    <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                      Find a Meeting
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
