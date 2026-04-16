// src/app/components/PwaInstallBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detectar si es instalable y no está instalado
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    
    if (!isInstalled && !dismissed) {
      // Escuchar evento beforeinstallprompt (Chrome/Edge)
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa_banner_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-gray-900/95 border border-amber-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <Download className="text-amber-400" size={24} />
          </div>
          <div>
            <p className="font-semibold text-white">¿Querés la app de La Magia?</p>
            <p className="text-sm text-gray-400">Instalala para acceder más rápido</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-sm transition"
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}