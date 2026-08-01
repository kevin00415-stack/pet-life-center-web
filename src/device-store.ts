import type { CareReminder, GrowthRecord, MemoryEntry, Pet, VoiceClip } from './domain'

const DB_NAME = 'maohai-local-care'
const DB_VERSION = 5

export interface MediaStorageItem {
  id: string
  metadata: {
    id: string
    petId: string
    createdAt: number
    type: 'photo' | 'video'
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
  blob: Blob
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const database = request.result
      const oldVersion = event.oldVersion

      // Creation helper for all previous version stores
      const ensureV1Stores = () => {
        if (!database.objectStoreNames.contains('pets')) database.createObjectStore('pets', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('reminders')) database.createObjectStore('reminders', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('voices')) database.createObjectStore('voices', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('memories')) database.createObjectStore('memories', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('growth')) database.createObjectStore('growth', { keyPath: 'id' })
      }

      if (oldVersion < 1) {
        ensureV1Stores()
      }

      if (oldVersion >= 1 && oldVersion < 4) {
        ensureV1Stores()
      }

      // v5 Upgrade: Create 'media' object store for binary Blobs and metadata
      if (oldVersion < 5) {
        ensureV1Stores()
        if (!database.objectStoreNames.contains('media')) {
          database.createObjectStore('media', { keyPath: 'id' })
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase()
  return requestResult(database.transaction(storeName, 'readonly').objectStore(storeName).getAll()) as Promise<T[]>
}

async function put<T>(storeName: string, value: T) {
  const database = await openDatabase()
  await requestResult(database.transaction(storeName, 'readwrite').objectStore(storeName).put(value))
}

async function remove(storeName: string, key: string) {
  const database = await openDatabase()
  await requestResult(database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key))
}

export async function loadPets() {
  const [pets, reminders, memories, growth] = await Promise.all([
    getAll<Pet>('pets'),
    getAll<CareReminder>('reminders'),
    getAll<MemoryEntry>('memories'),
    getAll<GrowthRecord>('growth'),
  ])
  const hasRelatedData = (petId: string) => {
    const hasReminder = reminders.some((item) => item.petId === petId)
    const hasMemory = memories.some((item) => item.petId === petId)
    const hasGrowth = growth.some((item) => item.petId === petId)
    return hasReminder || hasMemory || hasGrowth
  }

  const isUntouchedLegacySeed = (pet: Pet) => {
    const isLegacyPet = (pet.id === 'jiji' && pet.name === '吉吉') || (pet.id === 'coco' && pet.name === '可可')
    const hasNoCustomInfo = !pet.birthDate && !pet.avatarPhoto && !pet.coverPhoto
    return isLegacyPet && hasNoCustomInfo && !hasRelatedData(pet.id)
  }

  const legacySeeds = pets.filter(isUntouchedLegacySeed)
  if (legacySeeds.length) {
    await Promise.all(legacySeeds.map((pet) => remove('pets', pet.id)))
  }
  return pets.filter((pet) => !isUntouchedLegacySeed(pet))
}
export const savePet = (pet: Pet) => put('pets', pet)
export async function deletePetData(petId: string) {
  const [reminders, memories, growth] = await Promise.all([loadReminders(), loadMemories(), loadGrowthRecords()])
  const petReminders = reminders.filter((item) => item.petId === petId)
  const voiceIds = petReminders.map((item) => item.voiceClipId).filter((id): id is string => !!id)

  await Promise.all([
    remove('pets', petId),
    ...petReminders.map((item) => remove('reminders', item.id)),
    ...memories.filter((item) => item.petId === petId).map((item) => remove('memories', item.id)),
    ...growth.filter((item) => item.petId === petId).map((item) => remove('growth', item.id)),
    ...voiceIds.map((id) => remove('voices', id)),
  ])
}
export const loadReminders = () => getAll<CareReminder>('reminders')
export const saveReminder = (reminder: CareReminder) => put('reminders', reminder)
export const deleteReminder = (id: string) => remove('reminders', id)
export const loadVoices = () => getAll<VoiceClip>('voices')
export const saveVoice = (voice: VoiceClip) => put('voices', voice)
export const loadMemories = () => getAll<MemoryEntry>('memories')
export const saveMemory = (memory: MemoryEntry) => put('memories', memory)
export const deleteMemory = (id: string) => remove('memories', id)
export const loadGrowthRecords = () => getAll<GrowthRecord>('growth')
export const saveGrowthRecord = (record: GrowthRecord) => put('growth', record)
export const deleteGrowthRecord = (id: string) => remove('growth', id)

// Shared Media Store Actions
export const loadAllMedia = () => getAll<MediaStorageItem>('media')
export const saveMediaItem = (item: MediaStorageItem) => put('media', item)
export const deleteMediaItem = (id: string) => remove('media', id)

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string) {
  const [header, encoded] = dataUrl.split(',')
  const mimeType = header.match(/data:(.*?);/)?.[1] || 'audio/webm'
  return new Blob([Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))], { type: mimeType })
}

export async function createBackup() {
  const [pets, reminders, voices, memories, growth] = await Promise.all([loadPets(), loadReminders(), loadVoices(), loadMemories(), loadGrowthRecords()])
  return JSON.stringify({
    format: 'maohai-care-backup',
    version: 5,
    exportedAt: new Date().toISOString(),
    pets: await Promise.all(pets.map(async (pet) => ({
      ...pet,
      avatarPhoto: pet.avatarPhoto ? await blobToDataUrl(pet.avatarPhoto) : undefined,
      coverPhoto: pet.coverPhoto ? await blobToDataUrl(pet.coverPhoto) : undefined,
    }))),
    reminders,
    voices: await Promise.all(voices.map(async (voice) => ({ ...voice, blob: await blobToDataUrl(voice.blob) }))),
    memories: await Promise.all(memories.map(async (memory) => ({
      ...memory,
      photos: await Promise.all(memory.photos.map(async (photo) => ({ ...photo, blob: await blobToDataUrl(photo.blob) }))),
      videos: await Promise.all((memory.videos || []).map(async (video) => ({ ...video, blob: await blobToDataUrl(video.blob) }))),
    }))),
    growth,
  }, null, 2)
}

async function clearAllStores() {
  const database = await openDatabase()
  const stores = ['pets', 'reminders', 'voices', 'memories', 'growth', 'media']
  const transaction = database.transaction(stores, 'readwrite')
  await Promise.all(stores.map((store) => requestResult(transaction.objectStore(store).clear())))
}

async function snapshotDatabase() {
  const [pets, reminders, voices, memories, growth, media] = await Promise.all([
    getAll<Pet>('pets'),
    getAll<CareReminder>('reminders'),
    getAll<VoiceClip>('voices'),
    getAll<MemoryEntry>('memories'),
    getAll<GrowthRecord>('growth'),
    getAll<MediaStorageItem>('media'),
  ])
  return { pets, reminders, voices, memories, growth, media }
}

async function restoreFromSnapshot(snapshot: {
  pets: Pet[]
  reminders: CareReminder[]
  voices: VoiceClip[]
  memories: MemoryEntry[]
  growth: GrowthRecord[]
  media: MediaStorageItem[]
}) {
  await clearAllStores()
  const database = await openDatabase()
  const transaction = database.transaction(['pets', 'reminders', 'voices', 'memories', 'growth', 'media'], 'readwrite')
  await Promise.all([
    ...snapshot.pets.map((item) => requestResult(transaction.objectStore('pets').put(item))),
    ...snapshot.reminders.map((item) => requestResult(transaction.objectStore('reminders').put(item))),
    ...snapshot.voices.map((item) => requestResult(transaction.objectStore('voices').put(item))),
    ...snapshot.memories.map((item) => requestResult(transaction.objectStore('memories').put(item))),
    ...snapshot.growth.map((item) => requestResult(transaction.objectStore('growth').put(item))),
    ...snapshot.media.map((item) => requestResult(transaction.objectStore('media').put(item))),
  ])
}

export async function restoreBackup(text: string) {
  type SerializedPhoto = Omit<MemoryEntry['photos'][number], 'blob'> & { blob: string }
  type SerializedVideo = { id: string; blob: string; mimeType: string; name: string; size: number }
  const data = JSON.parse(text) as {
    format: string
    pets: Array<Omit<Pet, 'avatarPhoto' | 'coverPhoto'> & { avatarPhoto?: string; coverPhoto?: string }>
    reminders: CareReminder[]
    voices: Array<Omit<VoiceClip, 'blob'> & { blob: string }>
    memories?: Array<Omit<MemoryEntry, 'photos' | 'videos'> & { photos: SerializedPhoto[]; videos?: SerializedVideo[] }>
    growth?: GrowthRecord[]
  }
  if (data.format !== 'maohai-care-backup' || !Array.isArray(data.reminders)) throw new Error('invalid-backup')

  const snapshot = await snapshotDatabase()

  try {
    await clearAllStores()

    const database = await openDatabase()
    const transaction = database.transaction(['pets', 'reminders', 'voices', 'memories', 'growth'], 'readwrite')

    const petsToPut = (data.pets || []).map((pet) => ({
      ...pet,
      avatarPhoto: pet.avatarPhoto ? dataUrlToBlob(pet.avatarPhoto) : undefined,
      coverPhoto: pet.coverPhoto ? dataUrlToBlob(pet.coverPhoto) : undefined,
    }))
    const voicesToPut = (data.voices || []).map((voice) => ({
      ...voice,
      blob: dataUrlToBlob(voice.blob),
    }))
    const memoriesToPut = (data.memories || []).map((memory) => ({
      ...memory,
      photos: memory.photos.map((photo) => ({ ...photo, blob: dataUrlToBlob(photo.blob) })),
      videos: (memory.videos || []).map((video) => ({ ...video, blob: dataUrlToBlob(video.blob) })),
    }))
    const growthToPut = data.growth || []

    await Promise.all([
      ...petsToPut.map((item) => requestResult(transaction.objectStore('pets').put(item))),
      ...data.reminders.map((item) => requestResult(transaction.objectStore('reminders').put(item))),
      ...voicesToPut.map((item) => requestResult(transaction.objectStore('voices').put(item))),
      ...memoriesToPut.map((item) => requestResult(transaction.objectStore('memories').put(item))),
      ...growthToPut.map((item) => requestResult(transaction.objectStore('growth').put(item))),
    ])
  } catch (error) {
    await restoreFromSnapshot(snapshot)
    throw error
  }
}
