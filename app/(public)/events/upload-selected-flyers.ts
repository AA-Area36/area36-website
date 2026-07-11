import type { FlyerFile } from "@/components/flyer-upload"

type FlyerUploader = (
  eventId: string,
  formData: FormData
) => Promise<
  | { success: true; flyer: { id: string; fileKey: string; fileName: string; fileType: string; fileSize: number } }
  | { success: false; error: string }
>

export async function uploadSelectedFlyers(
  eventId: string,
  uploadToken: string | undefined,
  flyers: FlyerFile[],
  uploader: FlyerUploader
): Promise<{ failed: FlyerFile[]; errors: string[] }> {
  const failed: FlyerFile[] = []
  const errors: string[] = []

  for (const flyer of flyers) {
    if (!flyer.file) continue
    const formData = new FormData()
    formData.append("file", flyer.file)
    if (uploadToken) formData.append("uploadToken", uploadToken)

    try {
      const result = await uploader(eventId, formData)
      if (!result.success) {
        failed.push(flyer)
        errors.push(`${flyer.fileName}: ${result.error}`)
      }
    } catch {
      failed.push(flyer)
      errors.push(`${flyer.fileName}: upload failed`)
    }
  }

  return { failed, errors }
}

export function shouldResetEventSubmissionOnOpen(
  open: boolean,
  pendingUpload: { eventId: string } | null
): boolean {
  return open && pendingUpload === null
}
