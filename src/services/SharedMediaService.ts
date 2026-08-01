export type MediaType = 'photo' | 'video'

export interface MediaMetadata {
  id: string
  petId: string
  createdAt: number
  type: MediaType
  mimeType: string
  fileName: string
  fileSize: number
  duration?: number      // in seconds, when available
  thumbnailId?: string  // ID of the thumbnail in IndexedDB if available
  source: 'camera' | 'gallery' | 'file'
  context: string        // e.g. 'abnormal-event', 'senior-care'
  entityType: string     // e.g. 'abnormal-event'
  entityId: string       // ID of the associated entity
  tags?: string[]
}

export interface MediaStorageItem {
  id: string
  metadata: MediaMetadata
  blob: Blob
}

class SharedMediaService {
  private activePreviewUrls = new Set<string>()

  /**
   * Generates a temporary object URL for browser previews.
   * Make sure to revoke it using revokePreviewUrl() when no longer needed to prevent memory leaks.
   */
  createPreviewUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    this.activePreviewUrls.add(url)
    return url
  }

  /**
   * Revokes a temporary object URL to free browser memory.
   */
  revokePreviewUrl(url: string): void {
    if (this.activePreviewUrls.has(url)) {
      URL.revokeObjectURL(url)
      this.activePreviewUrls.delete(url)
    }
  }

  /**
   * Releases all active preview URLs at once (useful during component unmount).
   */
  releaseAllPreviews(): void {
    this.activePreviewUrls.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    this.activePreviewUrls.clear()
  }

  /**
   * Validates media file requirements based on file type and size.
   */
  validateMedia(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: '檔案不存在或已損壞。' }
    }

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      return { valid: false, error: '不支援的檔案類型，請選擇照片或影片。' }
    }

    if (isImage) {
      const maxPhotoBytes = 10 * 1024 * 1024 // 10MB
      if (file.size > maxPhotoBytes) {
        return { valid: false, error: '照片檔案超過 10 MB，請先在手機中壓縮或改選較小的檔案。' }
      }
    } else if (isVideo) {
      const maxVideoBytes = 150 * 1024 * 1024 // 150MB
      if (file.size > maxVideoBytes) {
        return { valid: false, error: '影片檔案超過 150 MB，請剪輯後或改選較短的影片。' }
      }
    }

    return { valid: true }
  }

  /**
   * Formats media capture metadata.
   */
  createMetadata(params: {
    id?: string
    petId: string
    type: MediaType
    mimeType: string
    fileName: string
    fileSize: number
    source: MediaMetadata['source']
    context: string
    entityType: string
    entityId: string
  }): MediaMetadata {
    return {
      id: params.id || `media-${crypto.randomUUID()}`,
      petId: params.petId,
      createdAt: Date.now(),
      type: params.type,
      mimeType: params.mimeType,
      fileName: params.fileName,
      fileSize: params.fileSize,
      source: params.source,
      context: params.context,
      entityType: params.entityType,
      entityId: params.entityId,
    }
  }
}

export const sharedMediaService = new SharedMediaService()
