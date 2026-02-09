export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="h-10 w-72 bg-muted rounded animate-pulse" />
            <div className="h-5 w-full max-w-lg bg-muted rounded animate-pulse mt-4" />
            <div className="h-5 w-3/4 max-w-md bg-muted rounded animate-pulse mt-2" />
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
