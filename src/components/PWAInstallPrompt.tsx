
import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event to trigger it later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install button
      setShowInstallPrompt(true);
    };

    // Check if user is on iOS but not already running in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Fix for TypeScript error: Check if window.navigator has MSStream property
    const isIE = typeof window !== 'undefined' && 
                typeof navigator !== 'undefined' && 
                /MSIE|Trident/.test(navigator.userAgent);

    // Only show iOS hint if on iOS, not in standalone mode, and hasn't dismissed before
    const hasSeenIOSHint = localStorage.getItem('hasSeenIOSHint') === 'true';
    
    if (isIOS && !isStandalone && !hasSeenIOSHint) {
      // Handle iOS specific install hint
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle the install button click
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const choiceResult = await deferredPrompt.userChoice;
    
    // Hide the install button regardless of outcome
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
    
    // Track outcome
    console.log(`User ${choiceResult.outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
  };

  // Hide the install hint
  const hideInstallHint = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('hasSeeniOSHint', 'true');
  };

  // If no prompt to show, render nothing
  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 flex justify-between items-center">
      <div>
        <h3 className="font-bold">Instalar o Álbum</h3>
        <p className="text-sm">Adicione à sua tela inicial para acesso rápido.</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={hideInstallHint}
          className="px-3 py-1 text-gray-600 rounded"
        >
          Depois
        </button>
        <button 
          onClick={handleInstallClick}
          className="px-3 py-1 bg-sticker-purple text-white rounded"
        >
          Instalar
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
