import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { PWAInstall } from '../components/PWAInstall';

export const metadata: Metadata = {
  title: 'MesoVortexWX | Weather Radar',
  description: 'Severe weather radar, forecasts, and alerts.',
  manifest: '/manifest.webmanifest',
  applicationName: 'MesoVortexWX',
  appleWebApp: {
    capable: true,
    title: 'MesoVortexWX',
    statusBarStyle: 'black-translucent'
  },
  icons: {
    icon: '/icons/app-icon.svg',
    apple: '/icons/app-icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: '#020817',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
