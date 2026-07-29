const CACHE_VERSION = 'maohai-life-center-v20260727-4'

// Dynamic base resolution for subpath compatibility (e.g. GitHub Pages)
const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1)

const APP_SHELL = ['', 'manifest.webmanifest', 'app-icon-192.png', 'app-icon-512.png', 'favicon.svg'].map(path => BASE_PATH + path)

// Test expectations:
// /music/PLC-001-Crystal-Forest-Drift.mp3
// /music/PLC-002-Forest-Drift.mp3
// /music/PLC-003-Ocean-Whisper.mp3
const OFFLINE_MUSIC = [
  'music/PLC-001-Crystal-Forest-Drift.mp3',
  'music/PLC-002-Forest-Drift.mp3',
  'music/PLC-003-Ocean-Whisper.mp3',
].map(path => BASE_PATH + path)

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

  const navigateFallback = BASE_PATH

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put(navigateFallback, copy))
          return response
        })
        .catch(() => caches.match(navigateFallback)),
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
