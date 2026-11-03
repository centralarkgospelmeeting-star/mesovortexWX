'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.error('MesoVortexWX offline support could not start:', error);
      });
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !installPrompt) return null;

  return (
    <button
      type="button"
      aria-label="Install MesoVortexWX as an app"
      onClick={async () => {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 2000,
        border: '1px solid rgba(103, 232, 249, .5)',
        borderRadius: 9999,
        padding: '12px 18px',
        color: '#ecfeff',
        background: 'linear-gradient(135deg, #0891b2, #1d4ed8)',
        boxShadow: '0 12px 40px rgba(8, 145, 178, .35)',
        font: '600 13px system-ui, sans-serif',
        cursor: 'pointer'
      }}
    >
      ↓ Install MesoVortexWX
    </button>
  );
}
