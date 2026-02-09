export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="h-10 w-48 bg-muted rounded animate-pulse" />
            <div className="h-5 w-full max-w-lg bg-muted rounded animate-pulse mt-4" />
          </div>
        </div>
      </section>

      {/* Quick links skeleton */}
      <section className="py-8 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-28 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* Documents skeleton */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-full max-w-md bg-muted rounded animate-pulse mb-6" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
