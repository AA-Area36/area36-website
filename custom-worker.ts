// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- generated only after the OpenNext build
// @ts-ignore `.open-next/worker.js` is generated during the OpenNext build.
import openNextHandler from "./.open-next/worker.js"
import { serveWithPublicHtmlCache } from "@/lib/cache/public-html-worker"
import { processPendingEventFlyerCleanup } from "@/lib/events/flyer-cleanup"

export default {
  async fetch(request, env, ctx) {
    const cache = (caches as CacheStorage & { default: Cache }).default
    return serveWithPublicHtmlCache({
      request,
      env,
      ctx,
      cache,
      next: () => openNextHandler.fetch(request, env, ctx),
    })
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(processPendingEventFlyerCleanup(env))
  },
} satisfies ExportedHandler<CloudflareEnv>

// Re-exported for future OpenNext cache Durable Objects.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- generated only after the OpenNext build
// @ts-ignore `.open-next/worker.js` is generated during the OpenNext build.
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js"
