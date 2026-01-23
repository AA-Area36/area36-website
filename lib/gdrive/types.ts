// Google Drive API types

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  description?: string
  createdTime: string
  modifiedTime: string
  size?: string
  webContentLink?: string
  webViewLink?: string
  thumbnailLink?: string
  parents?: string[]
}

export interface DriveFolder {
  id: string
  name: string
  mimeType: "application/vnd.google-apps.folder"
  description?: string
  createdTime: string
  modifiedTime: string
  parents?: string[]
}

export interface DriveListResponse {
  files: DriveFile[]
  nextPageToken?: string
}

// Newsletter types
export interface Newsletter {
  id: string
  title: string
  issue: string
  year: number
  month: number
  description: string
  highlights: string[]
  driveId: string
  previewUrl: string
  downloadUrl?: string
}

// Resource types
export type ResourceCategory =
  | "delegate-reports"
  | "area-documents"
  | "forms"
  | "conference-materials"

export interface Resource {
  id: string
  title: string
  description?: string
  category: ResourceCategory
  date?: string
  size?: string
  downloadUrl?: string
  previewUrl: string
  isProtected?: boolean
  driveId: string
}

export interface ResourcesByCategory {
  delegateReports: Resource[]
  areaDocuments: Resource[]
  forms: Resource[]
  conferenceMaterials: Resource[]
}

// Recording types - categories are now dynamic based on folder names
export interface CategoryInfo {
  id: string // Slugified category ID (e.g., "delegate-reports")
  name: string // Display name (e.g., "Delegate Reports")
  folderId?: string // Google Drive folder ID
  count: number // Number of recordings in this category
}

export interface Recording {
  id: string
  title: string
  description?: string
  category: string // Dynamic category ID (slugified folder name)
  year: number
  date?: string
  duration?: string
  driveId: string
  streamUrl: string
  folder?: string // Folder name for grouping (e.g., "Spring 2024 Assembly")
}

export interface RecordingsData {
  categories: CategoryInfo[]
  recordings: Record<string, Recording[]> // Keyed by category ID
}

// Credentials type
export interface GDriveCredentials {
  clientEmail: string
  privateKey: string
  privateKeyId: string
}

// Folder IDs config
export interface GDriveFolderIds {
  root: string
  newsletters: string
  resources: string
  recordings: string
}
