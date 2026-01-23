// Polyfill for __name helper that esbuild generates with keepNames option
// This fixes "ReferenceError: __name is not defined" in Cloudflare Workers
if (typeof (globalThis as unknown as { __name?: unknown }).__name === "undefined") {
  ;(globalThis as unknown as { __name: (fn: Function, name: string) => Function }).__name = (
    fn: Function,
    name: string
  ) => {
    Object.defineProperty(fn, "name", { value: name, configurable: true })
    return fn
  }
}

export async function register() {
  // Instrumentation registration
}
