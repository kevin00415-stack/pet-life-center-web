export type AttachmentType =
  | 'photo'
  | 'video'
  | 'voice'
  | 'pdf'
  | 'medical-report'
  | 'document'
  | 'image'

export type AttachmentContext =
  | 'abnormal-event'
  | 'senior-care'
  | 'daily-journal'
  | 'life-passport'
  | 'memories'
  | 'care-service'
  | 'boarding'
  | 'walking'
  | 'medical'

export interface GuardianAttachment {
  id: string
  petId: string
  createdAt: number
  updatedAt: number
  type: AttachmentType
  mimeType: string
  filename: string
  filesize: number
  duration?: number      // in seconds, e.g. for voice/video
  thumbnailId?: string  // reference to another attachment or IndexedDB entry
  context: AttachmentContext | string
  entityType: string     // e.g. 'abnormal-event', 'senior-care-entry'
  entityId: string       // ID of the target entry
  tags: string[]
  source: 'camera' | 'gallery' | 'file' | string
  version: number        // format versioning for future upgrades
}

export interface AttachmentStorageItem {
  id: string
  metadata: GuardianAttachment
  blob: Blob
}

class AttachmentService {
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
   * Validates attachment requirements based on attachment type and size.
   */
  validateAttachment(file: File, type?: AttachmentType): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: '檔案不存在或已損壞。' }
    }

    const resolvedType = type || this.resolveTypeFromMime(file.type)

    if (resolvedType === 'photo' || resolvedType === 'image') {
      const maxPhotoBytes = 10 * 1024 * 1024 // 10MB
      if (file.size > maxPhotoBytes) {
        return { valid: false, error: '照片檔案超過 10 MB，請先在手機中壓縮或改選較小的檔案。' }
      }
    } else if (resolvedType === 'video') {
      const maxVideoBytes = 150 * 1024 * 1024 // 150MB
      if (file.size > maxVideoBytes) {
        return { valid: false, error: '影片檔案超過 150 MB，請剪輯後或改選較短的影片。' }
      }
    } else if (resolvedType === 'pdf' || resolvedType === 'medical-report' || resolvedType === 'document') {
      const maxDocBytes = 25 * 1024 * 1024 // 25MB for clinical documents
      if (file.size > maxDocBytes) {
        return { valid: false, error: '文件檔案超過 25 MB，請改選較小的檔案。' }
      }
    } else if (resolvedType === 'voice') {
      const maxVoiceBytes = 10 * 1024 * 1024 // 10MB for voice clips
      if (file.size > maxVoiceBytes) {
        return { valid: false, error: '錄音檔案超過 10 MB，請縮短錄音時間。' }
      }
    }

    return { valid: true }
  }

  /**
   * Automatically resolves AttachmentType from standard MIME types.
   */
  resolveTypeFromMime(mimeType: string): AttachmentType {
    if (mimeType.startsWith('image/')) {
      return 'photo'
    }
    if (mimeType.startsWith('video/')) {
      return 'video'
    }
    if (mimeType.startsWith('audio/')) {
      return 'voice'
    }
    if (mimeType === 'application/pdf') {
      return 'pdf'
    }
    return 'document'
  }

  /**
   * Factory method to construct a standard, production-grade GuardianAttachment metadata object.
   */
  createAttachmentMetadata(params: {
    id?: string
    petId: string
    type: AttachmentType
    mimeType: string
    filename: string
    filesize: number
    duration?: number
    thumbnailId?: string
    context: AttachmentContext | string
    entityType: string
    entityId: string
    tags?: string[]
    source?: string
  }): GuardianAttachment {
    const now = Date.now()
    return {
      id: params.id || `attach-${crypto.randomUUID()}`,
      petId: params.petId,
      createdAt: now,
      updatedAt: now,
      type: params.type,
      mimeType: params.mimeType,
      filename: params.filename,
      filesize: params.filesize,
      duration: params.duration,
      thumbnailId: params.thumbnailId,
      context: params.context,
      entityType: params.entityType,
      entityId: params.entityId,
      tags: params.tags || [],
      source: params.source || 'file',
      version: 1, // S2-06 Foundation format standard v1
    }
  }
}

export const attachmentService = new AttachmentService()
