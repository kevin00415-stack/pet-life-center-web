import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAudioCoordination } from './audio-coordination'
import PublicWebsite from './public-site/PublicWebsite'
import { getLocale } from './i18n/translations'

void initializeAudioCoordination()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const swPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}sw.js`
    void navigator.serviceWorker.register(swPath).then((registration) => registration.update())
  })
}

document.documentElement.lang = getLocale()
const isPublicWebsite = window.location.pathname.replace(/\/$/, '') === '/website'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPublicWebsite ? <PublicWebsite /> : <App />}
  </StrictMode>,
)
