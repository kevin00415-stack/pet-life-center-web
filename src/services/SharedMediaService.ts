import { attachmentService } from './AttachmentService'

export type MediaType = 'photo' | 'video'

export interface MediaMetadata {
  id: string
  petId: string
  createdAt: number
  type: MediaType
  mimeType: string
  fileName: string
  fileSize: number
  duration?: number
  thumbnailId?: string
  source: 'camera' | 'gallery' | 'file'
  context: string
  entityType: string
  entityId: string
  tags?: string[]
}

class SharedMediaService {
  createPreviewUrl(blob: Blob): string {
    return attachmentService.createPreviewUrl(blob)
  }

  revokePreviewUrl(url: string): void {
    attachmentService.revokePreviewUrl(url)
  }

  releaseAllPreviews(): void {
    attachmentService.releaseAllPreviews()
  }

  validateMedia(file: File): { valid: boolean; error?: string } {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      return { valid: false, error: '不支援的檔案類型，請選擇照片或影片。' }
    }
    return attachmentService.validateAttachment(file, isImage ? 'photo' : 'video')
  }

  createMetadata(params: {
    id?: string
    petId: string
    type: MediaType
    mimeType: string
    fileName: string
    fileSize: number
    source: 'camera' | 'gallery' | 'file'
    context: string
    entityType: string
    entityId: string
  }): MediaMetadata {
    const meta = attachmentService.createAttachmentMetadata({
      id: params.id,
      petId: params.petId,
      type: params.type,
      mimeType: params.mimeType,
      filename: params.fileName,
      filesize: params.fileSize,
      source: params.source,
      context: params.context,
      entityType: params.entityType,
      entityId: params.entityId,
    })

    return {
      id: meta.id,
      petId: meta.petId,
      createdAt: meta.createdAt,
      type: meta.type as MediaType,
      mimeType: meta.mimeType,
      fileName: meta.filename,
      fileSize: meta.filesize,
      source: meta.source as 'camera' | 'gallery' | 'file',
      context: meta.context,
      entityType: meta.entityType,
      entityId: meta.entityId,
      tags: meta.tags,
    }
  }
}

export const sharedMediaService = new SharedMediaService()
