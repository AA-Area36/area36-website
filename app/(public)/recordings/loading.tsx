export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="h-10 w-48 bg-muted rounded animate-pulse" />
            <div className="h-5 w-full max-w-lg bg-muted rounded animate-pulse mt-4" />
            <div className="h-4 w-full max-w-md bg-muted rounded animate-pulse mt-4" />
          </div>
        </div>
      </section>

      {/* Recordings content skeleton */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search/filter bar */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="h-10 w-64 bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
          </div>
          {/* Recording items */}
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
