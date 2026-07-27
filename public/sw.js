const CACHE_VERSION = 'maohai-life-center-v20260727-4'
const APP_SHELL = ['/', '/manifest.webmanifest', '/app-icon-192.png', '/app-icon-512.png', '/favicon.svg']
const OFFLINE_MUSIC = [
  '/music/PLC-001-Crystal-Forest-Drift.mp3',
  '/music/PLC-002-Forest-Drift.mp3',
  '/music/PLC-003-Ocean-Whisper.mp3',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll([...APP_SHELL, ...OFFLINE_MUSIC])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        }
        return response
      })
      return cached || network
    }),
  )
})
