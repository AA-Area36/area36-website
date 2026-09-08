"use client"

export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId)
    if (!target) return

    event.preventDefault()
    window.history.pushState(null, "", `#${targetId}`)
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: "start" })
  }

  return (
    <a href={`#${targetId}`} className="skip-link" onClick={handleClick}>
      Skip to main content
    </a>
  )
}
