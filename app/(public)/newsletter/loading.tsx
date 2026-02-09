export default function NewsletterLoading() {
  return (
    <>
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-56 bg-muted rounded animate-pulse" />
          <div className="h-5 w-80 bg-muted rounded animate-pulse mt-4" />
        </div>
      </section>
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-[60vh] bg-muted rounded-xl animate-pulse" />
        </div>
      </section>
    </>
  )
}
