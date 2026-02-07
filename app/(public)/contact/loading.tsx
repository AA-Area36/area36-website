export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-48 bg-muted rounded animate-pulse" />
          <div className="h-5 w-full max-w-md bg-muted rounded animate-pulse mt-4" />
        </div>
      </section>

      {/* Form + sidebar skeleton */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Form skeleton */}
            <div className="space-y-6">
              <div className="h-7 w-40 bg-muted rounded animate-pulse" />
              <div className="space-y-4">
                <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                <div className="h-32 w-full bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
              </div>
            </div>
            {/* Sidebar skeleton */}
            <div className="space-y-6">
              <div className="h-48 bg-muted rounded-xl animate-pulse" />
              <div className="h-64 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
