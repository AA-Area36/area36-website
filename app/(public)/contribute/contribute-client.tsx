"use client"

import * as React from "react"
import { Heart, Mail, MapPin, CreditCard, CheckCircle, AlertCircle, Info, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { createTranslator } from "@/lib/content/t"
import type { ContentDoc } from "@/lib/content/schema"

type ContributeHeaderContent = {
  title?: string
  description?: string
}

export function ContributeClient({
  content,
  fallbackHeader,
}: {
  content?: ContentDoc
  fallbackHeader?: ContributeHeaderContent
}) {
  const { t } = createTranslator(content ?? {})
  const [isAAMember, setIsAAMember] = React.useState<boolean | null>(null)

  return (
    <>
      <PageHeader
        title={fallbackHeader?.title || t("header.title", "Contribute")}
        description={
          fallbackHeader?.description ||
          t(
            "header.description",
            "Supporting Area 36 through the Seventh Tradition helps carry the message of Alcoholics Anonymous throughout southern Minnesota.",
          )
        }
        ariaId="contribute-heading"
      />

      {/* AA Membership Check */}
      <section className="py-8 sm:py-12 border-b border-border" aria-labelledby="membership-check-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {isAAMember === null ? (
              <Card className="border-primary/20">
                <CardHeader className="text-center pb-4">
                  <CardTitle id="membership-check-heading" className="text-xl">
                    {t("membershipCheck.title", "Before You Contribute")}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {t("membershipCheck.question", "Are you a member of Alcoholics Anonymous?")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center gap-4">
                  <Button onClick={() => setIsAAMember(true)} size="lg">
                    {t("membershipCheck.yesLabel", "Yes, I am an A.A. member")}
                  </Button>
                  <Button onClick={() => setIsAAMember(false)} variant="outline" size="lg">
                    {t("membershipCheck.noLabel", "No")}
                  </Button>
                </CardContent>
              </Card>
            ) : isAAMember === false ? (
              <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        {t("membershipCheck.notMemberTitle", "Thank You for Your Interest")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t(
                          "membershipCheck.notMemberBody",
                          "Thank you for your interest in supporting Alcoholics Anonymous. However, in keeping with A.A.'s Seventh Tradition of self-support, we accept contributions only from A.A. members.",
                        )}
                      </p>
                      <p className="text-muted-foreground mt-4">
                        {t(
                          "membershipCheck.notMemberHelpPrefix",
                          "If you or someone you know needs help with a drinking problem, please visit",
                        )}{" "}
                        <Link
                          href="https://www.aa.org/find-aa"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          aa.org/find-aa
                        </Link>{" "}
                        {t("membershipCheck.notMemberHelpSuffix", "to find a meeting near you.")}
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsAAMember(null)}>
                        {t("membershipCheck.goBackLabel", "Go Back")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{t("membershipCheck.proceedMessage", "Thank you. Please scroll down to view contribution options.")}</span>
                <button onClick={() => setIsAAMember(null)} className="text-primary hover:underline ml-2">
                  {t("membershipCheck.changeAnswerLabel", "Change answer")}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7th Tradition Explanation */}
      <section className="py-12 sm:py-16" aria-labelledby="seventh-tradition-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Heart className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 id="seventh-tradition-heading" className="text-2xl font-bold text-foreground">
                  {t("tradition.title", "The Seventh Tradition")}
                </h2>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {t("tradition.shortFormTitle", "Short Form")}
                  </p>
                  <blockquote className="border-l-4 border-primary pl-4 italic text-lg text-muted-foreground">
                    {t(
                      "tradition.shortFormQuote",
                      '"Every A.A. group ought to be fully self-supporting, declining outside contributions."',
                    )}
                  </blockquote>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {t("tradition.longFormTitle", "Long Form")}
                  </p>
                  <blockquote className="border-l-4 border-primary/50 pl-4 italic text-sm text-muted-foreground">
                    {t(
                      "tradition.longFormQuote",
                      '"The A.A. groups themselves ought to be fully supported by the voluntary contributions of their own members. We think that each group should soon achieve this ideal; that any public solicitation of funds using the name of Alcoholics Anonymous is highly dangerous, whether by groups, clubs, hospitals, or other outside agencies; that acceptance of large gifts from any source, or of contributions carrying any obligation whatever, is unwise. Then too, we view with much concern those A.A. treasuries which continue, beyond prudent reserves, to accumulate funds for no stated A.A. purpose. Experience has often warned us that nothing can so surely destroy our spiritual heritage as futile disputes over property, money, and authority."',
                    )}
                  </blockquote>
                </div>
              </div>
              <div className="prose prose-muted dark:prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {t(
                    "tradition.paragraph1",
                    "The Seventh Tradition ensures that A.A. remains independent and free from outside influences. When we contribute to the work of A.A., we help support the services that made our recovery possible and ensure they will be available to others.",
                  )}
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  {t(
                    "tradition.paragraph2",
                    "Contributions to Area 36 help fund assemblies, workshops, delegate expenses, literature, and the many service activities that carry the A.A. message across southern Minnesota.",
                  )}
                </p>
              </div>
            </div>

            <Card className="bg-primary text-primary-foreground border-0">
              <CardHeader>
                <CardTitle className="text-primary-foreground">
                  {t("tradition.usageTitle", "How Contributions Are Used")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  t("tradition.usageItems.0", "Area Assemblies and Committee Meetings"),
                  t("tradition.usageItems.1", "Delegate expenses to General Service Conference"),
                  t("tradition.usageItems.2", "Literature and service materials"),
                  t("tradition.usageItems.3", "Communication and outreach"),
                  t("tradition.usageItems.4", "Public Information and CPC activities"),
                  t("tradition.usageItems.5", "Accessibility services and translation"),
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contribution Methods */}
      <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="contribution-methods-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="contribution-methods-heading" className="text-2xl font-bold text-foreground mb-8">
            {t("methods.title", "Ways to Contribute")}
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Mail */}
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Mail className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle>{t("methods.mail.title", "By Mail")}</CardTitle>
                <CardDescription>
                  {t("methods.mail.subtitle", 'Send a check payable to "SMAA"')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" aria-hidden="true" />
                    <div>
                      {t("methods.mail.addressLine1", "Southern Minnesota Area Assembly")}
                      <br />
                      {t("methods.mail.addressLine2", "P.O. Box 2812")}
                      <br />
                      {t("methods.mail.addressLine3", "Minneapolis, MN 55402")}
                    </div>
                  </div>
                </address>
                <p className="text-sm text-muted-foreground mt-4">
                  {t(
                    "methods.mail.note",
                    "Please include your group name and number (if applicable) on the check memo line.",
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Online */}
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <CreditCard className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle>{t("methods.online.title", "Online")}</CardTitle>
                <CardDescription>
                  {t("methods.online.subtitle", "Contribute securely online via PayPal")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full">
                  <Link
                    href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RBJBLHJQP9WZC"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("methods.online.buttonLabel", "Contribute via PayPal")}
                  </Link>
                </Button>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("methods.online.directIntro", "Or send directly via PayPal app/website to:")}
                  </p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {t("methods.online.directEmail", "treasurer@area36.org")}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">
                        {t("methods.online.notesTitle", "In the PayPal notes, please include:")}
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>{t("methods.online.noteItems.0", "Type: Group, Individual, Birthday, or Pink Can Plan")}</li>
                        <li>{t("methods.online.noteItems.1", "Group name and service ID (if group contribution)")}</li>
                        <li>{t("methods.online.noteItems.2", "For birthday contributions credited to your group, include group info")}</li>
                      </ul>
                      <p className="mt-2">
                        {t("methods.online.noteFooter", "Contributions acknowledged via email unless otherwise indicated.")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pink Can Plan */}
            <Card>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Heart className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle>{t("methods.pinkCan.title", "Pink Can Plan")}</CardTitle>
                <CardDescription>
                  {t("methods.pinkCan.subtitle", 'Send a check payable to "Pink Can Plan"')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" aria-hidden="true" />
                    <div>
                      {t("methods.pinkCan.addressLine1", "Pink Can Plan Coordinator")}
                      <br />
                      {t("methods.pinkCan.addressLine2", "PO Box 41633")}
                      <br />
                      {t("methods.pinkCan.addressLine3", "Plymouth, MN 55441-0633")}
                    </div>
                  </div>
                </address>
                <p className="text-sm text-muted-foreground mt-4">
                  {t(
                    "methods.pinkCan.body",
                    "The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional facilities.",
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Group Contributions */}
      <section className="py-12 sm:py-16" aria-labelledby="group-contributions-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 id="group-contributions-heading" className="text-2xl font-bold text-foreground mb-4">
              {t("groupContributions.title", "For Groups: Suggested Contribution Split")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "groupContributions.description",
                "After meeting expenses, many groups use the following suggested split for their Seventh Tradition contributions:",
              )}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {[
                {
                  percent: t("groupContributions.split.intergroup.percent", "50%"),
                  recipient: t("groupContributions.split.intergroup.recipient", "Intergroup"),
                  description: t("groupContributions.split.intergroup.description", "Local coordination"),
                },
                {
                  percent: t("groupContributions.split.area.percent", "30%"),
                  recipient: t("groupContributions.split.area.recipient", "Area 36"),
                  description: t("groupContributions.split.area.description", "Regional service"),
                },
                {
                  percent: t("groupContributions.split.district.percent", "10%"),
                  recipient: t("groupContributions.split.district.recipient", "District"),
                  description: t("groupContributions.split.district.description", "Local service"),
                },
                {
                  percent: t("groupContributions.split.gso.percent", "10%"),
                  recipient: t("groupContributions.split.gso.recipient", "GSO"),
                  description: t("groupContributions.split.gso.description", "A.A. World Services"),
                },
              ].map((split) => (
                <div key={split.recipient} className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{split.percent}</div>
                  <div className="font-semibold text-foreground mt-2">{split.recipient}</div>
                  <div className="text-xs text-muted-foreground mt-1">{split.description}</div>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              {t(
                "groupContributions.note",
                "This is a suggested split and may vary based on your group's conscience. The important thing is that your group contributes what it can to support A.A. at all levels.",
              )}
            </p>

            <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="font-semibold text-foreground mb-2">
                {t("groupContributions.gsoTitle", "GSO Contribution Address")}
              </h3>
              <address className="not-italic text-muted-foreground text-sm">
                {t("groupContributions.gsoAddressLine1", "General Service Office")}
                <br />
                {t("groupContributions.gsoAddressLine2", "P.O. Box 2407")}
                <br />
                {t("groupContributions.gsoAddressLine3", "James A. Farley Station")}
                <br />
                {t("groupContributions.gsoAddressLine4", "New York, NY 10116-2407")}
              </address>
              <p className="text-sm text-muted-foreground mt-3">
                {t("groupContributions.gsoOnlinePrefix", "Or contribute online at")}{" "}
                <Link
                  href="https://contribution.aa.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  aa.org/contribute
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="resources-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="resources-heading" className="text-2xl font-bold text-foreground mb-6">
            {t("resources.title", "Learn More About Self-Support")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="https://www.aa.org/self-support-where-money-and-spirituality-mix"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">
                {t("resources.link1", "Self-Support: Where Money and Spirituality Mix")}
              </span>
            </Link>
            <Link
              href="https://www.aa.org/aa-group-treasurer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">
                {t("resources.link2", "The A.A. Group Treasurer")}
              </span>
            </Link>
            <Link
              href="https://www.aa.org/seventh-tradition-fact-sheet-your-seventh-tradition-contributions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">
                {t("resources.link3", "Your Seventh Tradition Contributions")}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Thank You */}
      <section className="py-12 sm:py-16 bg-primary/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-foreground mb-4">{t("thankYou.title", "Thank You")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              "thankYou.description",
              "Your contributions help ensure that A.A.'s hand will always be there when the next suffering alcoholic reaches out for help. Thank you for supporting Area 36 and the work of Alcoholics Anonymous.",
            )}
          </p>
        </div>
      </section>
    </>
  )
}
