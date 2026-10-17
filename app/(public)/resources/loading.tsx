export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="h-10 w-48 bg-muted rounded animate-pulse" />
            <div className="h-5 w-full max-w-lg bg-muted rounded animate-pulse mt-4" />
          </div>
        </div>
      </section>

      {/* Documents skeleton */}
      <section className="pb-10 sm:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 h-12 w-full animate-pulse rounded bg-muted" />
          <div className="space-y-10">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="mb-5 h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-56 animate-pulse rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
