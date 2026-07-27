const MAX_INPUT_BYTES = 10 * 1024 * 1024
const MAX_PHOTO_EDGE = 1600
const TARGET_BYTES = 2 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function scaledPhotoSize(width: number, height: number, maxEdge = MAX_PHOTO_EDGE) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 }
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function prepareLocalPhoto(file: File): Promise<Blob> {
  if (!SUPPORTED_TYPES.has(file.type)) throw new Error('請選擇 JPG、PNG 或 WebP 照片。')
  if (file.size > MAX_INPUT_BYTES) throw new Error('照片超過 10 MB，請先在手機相簿縮小後再選擇。')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('這張照片無法讀取，請改用 JPG、PNG 或 WebP。')
  }

  const target = scaledPhotoSize(bitmap.width, bitmap.height)
  if (target.width === bitmap.width && target.height === bitmap.height && file.size <= TARGET_BYTES) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    bitmap.close()
    throw new Error('這台裝置目前無法處理照片，請改選較小的照片。')
  }
  context.drawImage(bitmap, 0, 0, target.width, target.height)
  bitmap.close()

  const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
  if (!compressed) throw new Error('照片縮小失敗，請改選較小的照片。')
  return compressed
}
