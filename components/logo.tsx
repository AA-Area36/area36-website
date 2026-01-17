import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

/**
 * AA Service Symbol Logo
 * Circle with equilateral triangle inside - responds to theme colors via currentColor
 */
export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], "text-primary", className)}
      aria-hidden="true"
    >
      {/* Outer circle */}
      <circle
        cx="20"
        cy="20"
        r="18"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Equilateral triangle pointing up - vertices touch the circle */}
      <path
        d="M20 2L35.6 29H4.4L20 2Z"
        fill="currentColor"
      />
    </svg>
  )
}
