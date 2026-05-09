// Polyfill for __name helper that esbuild generates with keepNames option
// This fixes "ReferenceError: __name is not defined" in Cloudflare Workers
type NamedFn = (...args: unknown[]) => unknown
if (typeof (globalThis as unknown as { __name?: unknown }).__name === "undefined") {
  ;(globalThis as unknown as { __name: (fn: NamedFn, name: string) => NamedFn }).__name = (
    fn: NamedFn,
    name: string
  ) => {
    Object.defineProperty(fn, "name", { value: name, configurable: true })
    return fn
  }
}

export async function register() {
  // Instrumentation registration
}
