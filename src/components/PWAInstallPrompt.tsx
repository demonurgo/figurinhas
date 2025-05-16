import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se o aplicativo está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar se é iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Critérios para mostrar a mensagem
    const shouldShow = () => {
      // Verificar se a mensagem já foi fechada recentemente
      const lastClosed = localStorage.getItem('pwaPromptClosed');
      if (lastClosed) {
        const lastClosedDate = new Date(parseInt(lastClosed));
        const now = new Date();
        // Se foi fechado há menos de 7 dias, não mostrar
        if ((now.getTime() - lastClosedDate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }
      
      return true;
    };

    // Mostrar após 3 segundos
    if (shouldShow()) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const closePrompt = () => {
    setShowPrompt(false);
    // Salvar quando foi fechado
    localStorage.setItem('pwaPromptClosed', Date.now().toString());
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 z-50 border-t border-gray-200">
      <div className="max-w-4xl mx-auto flex items-center">
        <div className="flex-1">
          <h3 className="font-medium text-sm">Instale nosso aplicativo</h3>
          <p className="text-xs text-gray-600">
            {isIOS ? 
              'Toque em "Compartilhar" e depois "Adicionar à Tela de Início"' : 
              'Instale nossa app para acesso rápido e uso offline!'}
          </p>
        </div>
        <div className="flex gap-2">
          <a 
            href="/instalar.html" 
            className="text-xs px-3 py-1.5 bg-sticker-purple text-white rounded-md"
            target="_blank"
            rel="noopener noreferrer"
          >
            Como instalar
          </a>
          <button 
            onClick={closePrompt}
            className="p-1.5 text-gray-500"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;