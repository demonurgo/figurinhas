
import { createRoot } from 'react-dom/client'
import { StrictMode, lazy, Suspense } from 'react'
import { initOfflineService } from "./services/OfflineDataService"
import './index.css'

// Lazy-load non-critical components
const App = lazy(() => import('./App.tsx'))
const SpeedInsights = lazy(() => import('@vercel/speed-insights/react').then(module => ({ default: module.SpeedInsights })))
const Analytics = lazy(() => import('@vercel/analytics/react').then(module => ({ default: module.Analytics })))

// Initialize offline data service
initOfflineService().catch(error => {
  console.error('Failed to initialize offline service:', error);
});

// Register service worker for PWA functionality with improved error handling
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

// Create root with StrictMode for better development experience and performance
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-sticker-purple border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    }>
      <App />
      <SpeedInsights />
      <Analytics />
    </Suspense>
  </StrictMode>
);
