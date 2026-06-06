"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, X, RotateCcw, Pencil, Loader2, ListCollapse } from "lucide-react"
import { cancelOccurrence, restoreOccurrence, revertOccurrence } from "./actions"
import { generateOccurrenceDates, getRecurrenceDescription, parseLocalDate } from "@/lib/utils/recurrence"
import { mergeEventWithException } from "@/lib/utils/exceptions"
import { formatTimeRange } from "@/lib/timezone"
import type { Event, EventException } from "@/lib/db/schema"
import { EditOccurrenceDialog } from "./edit-occurrence-dialog"

interface ManageOccurrencesDialogProps {
  event: Event
  exceptions: EventException[]
}

interface OccurrenceState {
  date: string
  isCancelled: boolean
  isModified: boolean
  exception?: EventException
}

export function ManageOccurrencesDialog({ event, exceptions }: ManageOccurrencesDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)

  // Build exception map for quick lookup
  const exceptionMap = React.useMemo(() => {
    const map = new Map<string, EventException>()
    for (const exception of exceptions) {
      map.set(exception.occurrenceDate, exception)
    }
    return map
  }, [exceptions])

  // Generate occurrences for the next year from today
  const occurrences = React.useMemo(() => {
    const today = new Date()
    const rangeEnd = new Date(today)
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)

    const dates = generateOccurrenceDates(event, today, rangeEnd)
    
    return dates.map((date): OccurrenceState => {
      const exception = exceptionMap.get(date)
      return {
        date,
        isCancelled: exception?.exceptionType === "cancelled",
        isModified: exception?.exceptionType === "modified",
        exception,
      }
    })
  }, [event, exceptionMap])

  const handleCancel = async (occurrenceDate: string) => {
    setLoadingAction(`cancel-${occurrenceDate}`)
    await cancelOccurrence(event.id, occurrenceDate)
    setLoadingAction(null)
  }

  const handleRestore = async (occurrenceDate: string) => {
    setLoadingAction(`restore-${occurrenceDate}`)
    await restoreOccurrence(event.id, occurrenceDate)
    setLoadingAction(null)
  }

  const handleRevert = async (occurrenceDate: string) => {
    setLoadingAction(`revert-${occurrenceDate}`)
    await revertOccurrence(event.id, occurrenceDate)
    setLoadingAction(null)
  }

  const formatOccurrenceDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (!event.isRecurring) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <ListCollapse className="h-4 w-4 mr-2" />
          Occurrences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Manage Occurrences</DialogTitle>
          <DialogDescription>
            {event.title} - {getRecurrenceDescription(event)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {occurrences.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No upcoming occurrences found.
              </p>
            ) : (
              occurrences.map((occurrence) => {
                const resolvedOccurrence = mergeEventWithException(event, occurrence.date, occurrence.exception ?? null)

                return (
                  <div
                    key={occurrence.date}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      occurrence.isCancelled
                        ? "bg-destructive/5 border-destructive/20"
                        : occurrence.isModified
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={`font-medium ${occurrence.isCancelled ? "line-through text-muted-foreground" : ""}`}>
                          {formatOccurrenceDate(occurrence.date)}
                        </span>
                        {occurrence.isCancelled && (
                          <Badge variant="destructive" className="text-xs">
                            Cancelled
                          </Badge>
                        )}
                        {occurrence.isModified && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Modified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {resolvedOccurrence.timeTBD
                            ? "Time TBD"
                            : formatTimeRange(
                                resolvedOccurrence.startTime,
                                resolvedOccurrence.endTime
                              )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {occurrence.isCancelled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(occurrence.date)}
                          disabled={loadingAction !== null}
                        >
                          {loadingAction === `restore-${occurrence.date}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          <EditOccurrenceDialog
                            event={event}
                            occurrenceDate={occurrence.date}
                            exception={occurrence.exception}
                            trigger={
                              <Button variant="outline" size="sm" disabled={loadingAction !== null}>
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            }
                          />
                          {occurrence.isModified && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevert(occurrence.date)}
                              disabled={loadingAction !== null}
                            >
                              {loadingAction === `revert-${occurrence.date}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Revert
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(occurrence.date)}
                            disabled={loadingAction !== null}
                            className="text-destructive hover:text-destructive"
                          >
                            {loadingAction === `cancel-${occurrence.date}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
