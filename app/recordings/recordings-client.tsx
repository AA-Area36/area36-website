"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Search,
  X,
  Filter,
  Calendar,
  Clock,
  Mic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { Recording, CategoryInfo } from "@/lib/gdrive/types"

interface RecordingsClientProps {
  categories: CategoryInfo[]
  recordings: Record<string, Recording[]>
  years: number[]
}

interface AudioPlayerState {
  recording: Recording | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function RecordingsClient({ categories, recordings, years }: RecordingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const audioRef = React.useRef<HTMLAudioElement>(null)

  // URL state - default to first category if available
  const defaultTab = categories[0]?.id || ""
  const initialTab = searchParams.get("tab") || defaultTab
  const initialSearch = searchParams.get("q") || ""
  const initialYear = searchParams.get("year") || "all"

  const [activeTab, setActiveTab] = React.useState(initialTab)
  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [yearFilter, setYearFilter] = React.useState(initialYear)

  // Audio player state
  const [playerState, setPlayerState] = React.useState<AudioPlayerState>({
    recording: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
  })

  // Update URL when filters change
  const updateURL = React.useCallback(
    (tab: string, search: string, year: string) => {
      const params = new URLSearchParams()
      if (tab !== defaultTab) params.set("tab", tab)
      if (search) params.set("q", search)
      if (year && year !== "all") params.set("year", year)

      const queryString = params.toString()
      router.replace(queryString ? `?${queryString}` : "/recordings", { scroll: false })
    },
    [router, defaultTab]
  )

  // Get recordings for current tab
  const getCurrentRecordings = React.useCallback((): Recording[] => {
    return recordings[activeTab] || []
  }, [activeTab, recordings])

  // Filter recordings
  const filteredRecordings = React.useMemo(() => {
    return getCurrentRecordings().filter((recording) => {
      const matchesSearch =
        searchQuery === "" ||
        recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesYear =
        yearFilter === "all" || recording.year === parseInt(yearFilter)

      return matchesSearch && matchesYear
    })
  }, [getCurrentRecordings, searchQuery, yearFilter])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    updateURL(value, searchQuery, yearFilter)
  }

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateURL(activeTab, value, yearFilter)
  }

  // Handle year filter change
  const handleYearChange = (value: string) => {
    setYearFilter(value)
    updateURL(activeTab, searchQuery, value)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("")
    setYearFilter("all")
    updateURL(activeTab, "", "all")
  }

  const hasActiveFilters = searchQuery !== "" || yearFilter !== "all"

  // Audio player controls
  const playRecording = (recording: Recording) => {
    if (playerState.recording?.id === recording.id) {
      // Toggle play/pause for same recording
      if (playerState.isPlaying) {
        audioRef.current?.pause()
      } else {
        audioRef.current?.play()
      }
    } else {
      // Play new recording
      setPlayerState((prev) => ({
        ...prev,
        recording,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
      }))
    }
  }

  const togglePlayPause = () => {
    if (playerState.isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlayerState((prev) => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
        duration: audioRef.current!.duration || 0,
      }))
    }
  }

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setPlayerState((prev) => ({ ...prev, currentTime: value[0] }))
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setPlayerState((prev) => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }))
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (playerState.isMuted) {
        audioRef.current.volume = playerState.volume || 0.8
        setPlayerState((prev) => ({ ...prev, isMuted: false }))
      } else {
        audioRef.current.volume = 0
        setPlayerState((prev) => ({ ...prev, isMuted: true }))
      }
    }
  }

  // Audio event handlers
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setPlayerState((prev) => ({ ...prev, isPlaying: true }))
    const handlePause = () => setPlayerState((prev) => ({ ...prev, isPlaying: false }))
    const handleEnded = () => setPlayerState((prev) => ({ ...prev, isPlaying: false }))
    const handleLoadedMetadata = () => {
      setPlayerState((prev) => ({ ...prev, duration: audio.duration }))
    }

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [])

  // Auto-play when recording changes
  React.useEffect(() => {
    if (playerState.recording && audioRef.current) {
      audioRef.current.load()
      audioRef.current.play().catch(() => {
        // Auto-play may be blocked by browser
      })
    }
  }, [playerState.recording?.id])

  // Calculate total count across all categories
  const totalCount = Object.values(recordings).flat().length

  return (
    <div className="space-y-8">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata">
        {playerState.recording && (
          <source src={playerState.recording.streamUrl} type="audio/mpeg" />
        )}
      </audio>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search recordings"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={yearFilter} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-primary"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs - rendered dynamically */}
      {categories.length > 0 ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-2">
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="gap-2">
                <Mic className="h-4 w-4" aria-hidden="true" />
                {category.name}
                {category.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {category.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredRecordings.length === getCurrentRecordings().length
              ? `${filteredRecordings.length} recordings`
              : `${filteredRecordings.length} of ${getCurrentRecordings().length} recordings`}
          </div>

          {/* Recording lists - rendered dynamically for each category */}
          {categories.map((category) => {
            // Group recordings by folder
            const categoryRecordings = recordings[category.id] || []
            const filteredCategoryRecordings = categoryRecordings.filter((recording) => {
              const matchesSearch =
                searchQuery === "" ||
                recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recording.description?.toLowerCase().includes(searchQuery.toLowerCase())

              const matchesYear =
                yearFilter === "all" || recording.year === parseInt(yearFilter)

              return matchesSearch && matchesYear
            })

            const groupedRecordings = filteredCategoryRecordings.reduce((acc, recording) => {
              const folder = recording.folder || "Other Recordings"
              if (!acc[folder]) {
                acc[folder] = []
              }
              acc[folder].push(recording)
              return acc
            }, {} as Record<string, Recording[]>)

            // Sort folders by year (most recent first) based on recordings in each folder
            const sortedFolders = Object.keys(groupedRecordings).sort((a, b) => {
              const aMaxYear = Math.max(...groupedRecordings[a].map(r => r.year))
              const bMaxYear = Math.max(...groupedRecordings[b].map(r => r.year))
              return bMaxYear - aMaxYear
            })

            return (
              <TabsContent key={category.id} value={category.id} className="space-y-6">
                {filteredCategoryRecordings.length === 0 ? (
                  <div className="text-center py-12">
                    <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recordings found</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-primary hover:underline mt-2"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  sortedFolders.map((folder) => (
                    <div key={folder} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                        {folder}
                      </h3>
                      <div className="grid gap-3">
                        {groupedRecordings[folder].map((recording) => {
                          const isCurrentlyPlaying =
                            playerState.recording?.id === recording.id && playerState.isPlaying

                          return (
                            <button
                              key={recording.id}
                              onClick={() => playRecording(recording)}
                              className={cn(
                                "w-full text-left rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md",
                                playerState.recording?.id === recording.id &&
                                  "border-primary bg-primary/5"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                                    isCurrentlyPlaying
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-primary/10 text-primary"
                                  )}
                                >
                                  {isCurrentlyPlaying ? (
                                    <Pause className="h-5 w-5" aria-hidden="true" />
                                  ) : (
                                    <Play className="h-5 w-5 ml-0.5" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground truncate">
                                    {recording.title}
                                  </h4>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    {recording.date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {recording.date}
                                      </span>
                                    )}
                                    {recording.duration && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {recording.duration}
                                      </span>
                                    )}
                                  </div>
                                  {recording.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                      {recording.description}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  {recording.year}
                                </Badge>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        <div className="text-center py-12">
          <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recording categories found</p>
        </div>
      )}

      {/* Sticky Audio Player */}
      {playerState.recording && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="h-10 w-10 rounded-full"
              >
                {playerState.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate text-sm">
                  {playerState.recording.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground w-10">
                    {formatTime(playerState.currentTime)}
                  </span>
                  <Slider
                    value={[playerState.currentTime]}
                    max={playerState.duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1"
                    aria-label="Seek"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {formatTime(playerState.duration)}
                  </span>
                </div>
              </div>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
                  {playerState.isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[playerState.isMuted ? 0 : playerState.volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed player */}
      {playerState.recording && <div className="h-24" />}
    </div>
  )
}
