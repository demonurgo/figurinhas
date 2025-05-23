
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
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
    
    // Only show iOS hint if on iOS, not in standalone mode, and hasn't dismissed before
    const hasSeenIOSHint = localStorage.getItem('hasSeenIOSHint') === 'true';
    
    if (isIOS && !isStandalone && !hasSeenIOSHint) {
      setShowIOSPrompt(true);
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
    localStorage.setItem('dontShowInstallPrompt', 'true'); // Remember user's choice
  };

  // Hide iOS hint
  const hideIOSHint = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('hasSeenIOSHint', 'true');
  };

  // If no prompt to show, render nothing
  if (!showInstallPrompt && !showIOSPrompt) return null;

  // iOS-specific install instructions
  if (showIOSPrompt) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg">Instalar no seu iPhone/iPad</h3>
          <Button variant="ghost" size="icon" onClick={hideIOSHint}>
            <X size={18} />
          </Button>
        </div>
        <div className="text-sm space-y-2">
          <p>Para instalar o aplicativo na sua tela inicial:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Toque no botão de compartilhamento <span className="inline-block px-2 py-1 bg-gray-200 rounded">⬆️</span></li>
            <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">
            Você poderá acessar o álbum mesmo quando estiver offline!
          </p>
        </div>
      </Card>
    );
  }

  // Standard install prompt for other browsers (Chrome, Edge, etc.)
  return (
    <Card className="fixed bottom-4 left-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">Instalar o Álbum de Figurinhas</h3>
          <p className="text-sm">Adicione à sua tela inicial para acesso offline!</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={hideInstallHint}
            className="px-3 py-1 text-gray-600"
          >
            Depois
          </Button>
          <Button 
            onClick={handleInstallClick}
            size="sm"
            className="px-3 py-1 bg-sticker-purple text-white rounded flex items-center"
          >
            <Download size={16} className="mr-1" />
            Instalar
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PWAInstallPrompt;
