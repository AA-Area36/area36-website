/**
 * Template component that wraps each page in the (public) route group.
 * Unlike layout.tsx, template.tsx re-mounts on every navigation,
 * which triggers the CSS fade-in animation on each page change.
 *
 * Uses a pure CSS animation — no JavaScript, no layout shift.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>
}
