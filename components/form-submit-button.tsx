"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type FormSubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingText?: React.ReactNode
}

export function FormSubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending ? (pendingText ?? children) : children}
    </Button>
  )
}
