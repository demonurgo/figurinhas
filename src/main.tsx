
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"
import { initOfflineService } from "./services/OfflineDataService"

// Initialize offline data service
initOfflineService().catch(error => {
  console.error('Failed to initialize offline service:', error);
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.log('Failed to register Service Worker:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SpeedInsights />
    <Analytics />
  </>
);
