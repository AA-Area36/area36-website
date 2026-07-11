"use client"

import { useState, useTransition, useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Mail, MapPin, Send, CheckCircle, Shield, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "@/components/multi-select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { contactFormSchema, type ContactFormData } from "@/lib/schemas/contact"
import { createTranslator } from "@/lib/content/t"
import type { ContentDoc } from "@/lib/content/schema"
import { submitContactForm } from "./actions"

type ContactHeaderContent = {
  title?: string
  description?: string
}

function ContactForm({ content, header }: { content?: ContentDoc; header?: ContactHeaderContent }) {
  const { t } = createTranslator(content ?? {})
  const recipients = [
    { value: "general", label: t("recipients.general.label", "General Inquiry"), email: t("recipients.general.email", "chairperson@area36.org") },
    { value: "chairperson", label: t("recipients.chairperson.label", "Area Chairperson"), email: t("recipients.chairperson.email", "chairperson@area36.org") },
    { value: "delegate", label: t("recipients.delegate.label", "Delegate"), email: t("recipients.delegate.email", "delegate@area36.org") },
    { value: "treasurer", label: t("recipients.treasurer.label", "Treasurer"), email: t("recipients.treasurer.email", "treasurer@area36.org") },
    { value: "secretary", label: t("recipients.secretary.label", "Secretary"), email: t("recipients.secretary.email", "secretary@area36.org") },
    { value: "technology", label: t("recipients.technology.label", "Technology Chair"), email: t("recipients.technology.email", "technology@area36.org") },
    { value: "webmaster", label: t("recipients.webmaster.label", "Webmaster"), email: t("recipients.webmaster.email", "webmaster@area36.org") },
    { value: "accessibility", label: t("recipients.accessibility.label", "Accessibility Committee"), email: t("recipients.accessibility.email", "accessibility@area36.org") },
    { value: "archives", label: t("recipients.archives.label", "Archives Committee"), email: t("recipients.archives.email", "archives@area36.org") },
    { value: "cpc", label: t("recipients.cpc.label", "CPC Committee"), email: t("recipients.cpc.email", "cpc@area36.org") },
    { value: "corrections", label: t("recipients.corrections.label", "Corrections Committee"), email: t("recipients.corrections.email", "corrections@area36.org") },
    { value: "grapevine", label: t("recipients.grapevine.label", "Grapevine Committee"), email: t("recipients.grapevine.email", "grapevine@area36.org") },
    { value: "literature", label: t("recipients.literature.label", "Literature Committee"), email: t("recipients.literature.email", "literature@area36.org") },
    { value: "pi", label: t("recipients.pi.label", "Public Information Committee"), email: t("recipients.pi.email", "pi@area36.org") },
    { value: "treatment", label: t("recipients.treatment.label", "Treatment Committee"), email: t("recipients.treatment.email", "treatment@area36.org") },
  ]
  const officers = [
    { role: t("officers.delegate.role", "Delegate"), description: t("officers.delegate.description", "GSC representative"), email: t("officers.delegate.email", "delegate@area36.org") },
    { role: t("officers.alternateDelegate.role", "Alternate Delegate"), description: t("officers.alternateDelegate.description", "Assists Delegate"), email: t("officers.alternateDelegate.email", "altdelegate@area36.org") },
    { role: t("officers.chairperson.role", "Chairperson"), description: t("officers.chairperson.description", "Area leadership"), email: t("officers.chairperson.email", "chairperson@area36.org") },
    { role: t("officers.alternateChair.role", "Alternate Chair"), description: t("officers.alternateChair.description", "Assists Chair"), email: t("officers.alternateChair.email", "altchairperson@area36.org") },
    { role: t("officers.secretary.role", "Secretary"), description: t("officers.secretary.description", "Area records"), email: t("officers.secretary.email", "secretary@area36.org") },
    { role: t("officers.treasurer.role", "Treasurer"), description: t("officers.treasurer.description", "Financial matters"), email: t("officers.treasurer.email", "treasurer@area36.org") },
  ]
  const committees = [
    { name: t("committees.accessibility.name", "Accessibility"), email: t("committees.accessibility.email", "accessibility@area36.org") },
    { name: t("committees.archives.name", "Archives"), email: t("committees.archives.email", "archives@area36.org") },
    { name: t("committees.cpc.name", "CPC"), email: t("committees.cpc.email", "cpc@area36.org") },
    { name: t("committees.corrections.name", "Corrections"), email: t("committees.corrections.email", "corrections@area36.org") },
    { name: t("committees.grapevine.name", "Grapevine / La Viña"), email: t("committees.grapevine.email", "grapevine@area36.org") },
    { name: t("committees.groupRecords.name", "Group Records"), email: t("committees.groupRecords.email", "grouprecords@area36.org") },
    { name: t("committees.literature.name", "Literature"), email: t("committees.literature.email", "literature@area36.org") },
    { name: t("committees.pi.name", "Public Information"), email: t("committees.pi.email", "pi@area36.org") },
    { name: t("committees.technology.name", "Technology"), email: t("committees.technology.email", "technology@area36.org") },
    { name: t("committees.treatment.name", "Treatment"), email: t("committees.treatment.email", "treatment@area36.org") },
    { name: t("committees.website.name", "Website"), email: t("committees.website.email", "webmaster@area36.org") },
  ]
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
      recipients: [],
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

  const selectedRecipients = watch("recipients") ?? []
  const selectedRecipientDetails = useMemo(
    () => recipients.filter((recipient) => selectedRecipients.includes(recipient.value)),
    [selectedRecipients]
  )
  const getErrorProps = (field: keyof ContactFormData) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  })

  const onSubmit = useCallback(async (data: ContactFormData) => {
    setSubmitError(null)

    startTransition(async () => {
      try {
        if (!executeRecaptcha) {
          setSubmitError(t("form.recaptchaNotLoadedError", "reCAPTCHA not loaded. Please refresh and try again."))
          return
        }
        const token = await executeRecaptcha("contact_form")
        
        // Submit form with token
        const result = await submitContactForm({ ...data, recaptchaToken: token })

        if (result.success) {
          setSubmitted(true)
        } else {
          setSubmitError(result.error ?? t("form.genericError", "An error occurred"))
        }
      } catch (error) {
        console.error("Form submission error:", error)
        setSubmitError(
          `${t("form.recaptchaErrorPrefix", "reCAPTCHA error:")} ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    })
  }, [executeRecaptcha])

  const handleSendAnother = () => {
    setSubmitted(false)
    setSubmitError(null)
    reset()
  }

  return (
      <>
        <PageHeader
          title={header?.title || t("header.title", "Contact Us")}
          description={
            header?.description ||
            t(
              "header.description",
              "Have questions about Area 36 or general service? Select who you'd like to contact and send us a message.",
            )
          }
          maxWidth="2xl"
          ariaId="contact-heading"
        />

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Form */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">{t("form.title", "Send a Message")}</h2>

                {submitted ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center" role="status" aria-live="polite">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {t("form.successTitle", "Message Sent!")}
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      {t("form.successPrefix", "Thank you for your message.")}{" "}
                      {selectedRecipientDetails.length > 0
                        ? `${selectedRecipientDetails.map((recipient) => recipient.label).join(", ")} ${t("form.successSuffix", "will get back to you soon.")}`
                        : t("form.successFallback", "Your selected recipients will get back to you soon.")}
                    </p>
                    <Button variant="outline" className="mt-6 bg-transparent" onClick={handleSendAnother}>
                      {t("form.sendAnotherLabel", "Send Another Message")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {submitError && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert" aria-live="assertive">
                        {submitError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="recipients">
                        {t("form.recipientsLabel", "Who would you like to contact?")} <span className="text-destructive">*</span>
                      </Label>
                      <MultiSelect
                        id="recipients"
                        options={recipients.map((recipient) => ({
                          label: recipient.label,
                          value: recipient.value,
                        }))}
                        value={selectedRecipients}
                        onChange={(value) => setValue("recipients", value, { shouldValidate: true })}
                        placeholder={t("form.recipientsPlaceholder", "Select recipients")}
                        className="w-full"
                        {...getErrorProps("recipients")}
                      />
                      {errors.recipients && (
                        <p id="recipients-error" className="text-sm text-destructive">{errors.recipients.message}</p>
                      )}
                      {selectedRecipientDetails.length > 0 && (
                        <div className="rounded-md border border-border bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("form.selectedRecipientsLabel", "Selected recipients")}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {selectedRecipientDetails.map((recipient) => (
                              <li key={recipient.value} className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{recipient.label}</span>{" "}
                                <span>({recipient.email})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">
                          {t("form.firstNameLabel", "First Name")} <span className="text-destructive">*</span>
                        </Label>
                        <Input id="firstName" {...register("firstName")} {...getErrorProps("firstName")} />
                        {errors.firstName && (
                          <p id="firstName-error" className="text-sm text-destructive">{errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">
                          {t("form.lastNameLabel", "Last Name")} <span className="text-destructive">*</span>
                        </Label>
                        <Input id="lastName" {...register("lastName")} {...getErrorProps("lastName")} />
                        {errors.lastName && (
                          <p id="lastName-error" className="text-sm text-destructive">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        {t("form.emailLabel", "Email")} <span className="text-destructive">*</span>
                      </Label>
                      <Input id="email" type="email" {...register("email")} {...getErrorProps("email")} />
                      {errors.email && (
                        <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("form.phoneLabel", "Phone Number")}</Label>
                      <Input id="phone" type="tel" {...register("phone")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">
                        {t("form.subjectLabel", "Subject")} <span className="text-destructive">*</span>
                      </Label>
                      <Input id="subject" placeholder={t("form.subjectPlaceholder", "Brief subject line")} {...register("subject")} {...getErrorProps("subject")} />
                      {errors.subject && (
                        <p id="subject-error" className="text-sm text-destructive">{errors.subject.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">
                        {t("form.messageLabel", "Message")} <span className="text-destructive">*</span>
                      </Label>
                      <Textarea id="message" rows={5} className="resize-none" {...register("message")} {...getErrorProps("message")} />
                      {errors.message && (
                        <p id="message-error" className="text-sm text-destructive">{errors.message.message}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span>{t("form.recaptchaNotice", "This form is protected by Google reCAPTCHA v3.")}</span>
                      </div>
                      {errors.recaptchaToken && (
                        <p className="text-sm text-destructive mt-2">{errors.recaptchaToken.message}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="consent"
                        {...getErrorProps("consent")}
                        checked={watch("consent")}
                        onCheckedChange={(checked) =>
                          setValue("consent", checked === true ? true : (false as unknown as true), { shouldValidate: true })
                        }
                      />
                      <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed">
                        {t(
                          "form.consentText",
                          "I understand that A.A. is a program of anonymity and that my contact information will be kept confidential.",
                        )}
                      </Label>
                    </div>
                    {errors.consent && (
                      <p id="consent-error" className="text-sm text-destructive">{errors.consent.message}</p>
                    )}

                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          {t("form.sendingLabel", "Sending...")}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                          {t("form.sendButtonLabel", "Send Message")}
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
                      <h3 className="font-semibold text-foreground">
                        {t("contactInfo.mailingAddressTitle", "Mailing Address")}
                      </h3>
                      <address className="mt-2 text-muted-foreground not-italic leading-relaxed">
                        {t("contactInfo.mailingAddressLine1", "SMAA")}
                        <br />
                        {t("contactInfo.mailingAddressLine2", "P.O. Box 2812")}
                        <br />
                        {t("contactInfo.mailingAddressLine3", "Minneapolis, MN 55402")}
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
                      <h3 className="font-semibold text-foreground mb-4">
                        {t("contactInfo.directContactsTitle", "Direct Email Contacts")}
                      </h3>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="officers" className="border-b-0">
                          <AccordionTrigger className="py-3 hover:no-underline">
                            <span className="text-sm font-medium">{t("contactInfo.officersTitle", "Area Officers")}</span>
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
                            <span className="text-sm font-medium">
                              {t("contactInfo.committeesTitle", "Committee Chairs")}
                            </span>
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
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    {t("contactInfo.immediateHelpTitle", "Need Immediate Help?")}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                    {t(
                      "contactInfo.immediateHelpBody",
                      "If you or someone you know is struggling with alcohol, the most important thing is to find a meeting.",
                    )}
                  </p>
                  <Button asChild variant="outline" className="bg-transparent border-amber-300 dark:border-amber-700">
                    <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                      {t("contactInfo.immediateHelpButtonLabel", "Find a Meeting")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
  )
}

export function ContactClient({
  content,
  fallbackHeader,
}: {
  content?: ContentDoc
  fallbackHeader?: ContactHeaderContent
}) {
  return <ContactForm content={content} header={fallbackHeader} />
}
