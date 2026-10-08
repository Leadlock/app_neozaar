'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show prompt after 5 seconds
    if (isIOSDevice && !window.navigator.standalone) {
      setTimeout(() => {
        if (!localStorage.getItem('pwa-prompt-dismissed')) {
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      if (isIOS) {
        alert('Tap Share button 📤 then "Add to Home Screen"');
      }
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    
    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-black/90 backdrop-blur-lg border border-white/10 rounded-lg p-4 shadow-2xl z-50 animate-slide-up">
      {/* Dismiss button */}
      <button onClick={handleDismiss} className="absolute top-2 right-2 text-white/60 hover:text-white">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        {/* App icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <Image
            src="/brand-log/neozaardefault.jpg"
            alt="NeoZaar"
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          {/* Title + wordmark row */}
          <div className="flex items-center gap-2 mb-0.5">
            <Image
              src="/image/Logo.png"
              alt="NeoZaar"
              width={61}
              height={20}
              className="h-5 w-auto"
            />
          </div>
          <h3 className="text-white font-semibold text-sm">Install NeoZaar App</h3>

          {isIOS ? (
            <div className="text-xs text-white/70 mt-2">
              <p className="mb-1.5 text-white/80">Install on iPhone:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap Share button <span className="inline-block">📤</span></li>
                <li>Scroll down and tap Add to Home Screen</li>
                <li>Tap Add in the top right corner</li>
              </ol>
            </div>
          ) : (
            <div className="text-xs text-white/70 mt-2">
              <p className="mb-2">Faster access &amp; offline support</p>
              <button
                onClick={handleInstallClick}
                className="bg-orange-600 text-white px-4 py-1.5 rounded-lg hover:bg-orange-700 transition text-xs font-medium"
              >
                Install Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}