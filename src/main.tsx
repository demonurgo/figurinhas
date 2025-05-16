import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SpeedInsights } from "@vercel/speed-insights/react"

// Registra o service worker para a funcionalidade PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.log('Falha ao registrar Service Worker:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SpeedInsights />
  </>
);
