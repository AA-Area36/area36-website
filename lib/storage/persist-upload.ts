/**
 * Persist metadata for an object that has already been uploaded. If persistence
 * fails, remove the object so a failed request does not leave orphaned storage.
 */
export async function persistUploadedObject<T>(
  persist: () => Promise<T>,
  removeObject: () => Promise<void>
): Promise<T> {
  try {
    return await persist()
  } catch (error) {
    try {
      await removeObject()
    } catch (cleanupError) {
      console.error("Failed to compensate for an unpersisted upload", cleanupError)
    }
    throw error
  }
}
