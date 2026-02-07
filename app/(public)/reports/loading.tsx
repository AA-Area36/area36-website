export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-56 bg-muted rounded animate-pulse" />
          <div className="h-5 w-full max-w-sm bg-muted rounded animate-pulse mt-4" />
        </div>
      </section>

      {/* Reports list skeleton */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
