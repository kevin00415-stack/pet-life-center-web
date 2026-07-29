import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAudioCoordination } from './audio-coordination'

void initializeAudioCoordination()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const swPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}sw.js`
    void navigator.serviceWorker.register(swPath).then((registration) => registration.update())
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
