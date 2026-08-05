import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function AdminMain({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn("outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  )
}
