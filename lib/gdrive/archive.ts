import type { DriveFile } from "./types"

// Treat folders explicitly labeled as "archive" or "archived" as hidden.
const ARCHIVE_FOLDER_PATTERN = /\barchiv(e|ed)\b/i

export function isArchivedFolderName(name: string): boolean {
  return ARCHIVE_FOLDER_PATTERN.test(name)
}

export function filterArchivedFolders<T extends Pick<DriveFile, "name">>(folders: T[]): T[] {
  return folders.filter((folder) => !isArchivedFolderName(folder.name))
}
