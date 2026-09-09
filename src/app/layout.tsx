import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/organisms/Navbar';

export const metadata: Metadata = {
  title: 'SIR-Assist | Official Government Voter Verification Portal',
  description:
    'Statutory Offline-First Legacy Voter Roll (2002-04) Verification & On-Device Zero-Leak OCR Audit Engine',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SIR-Assist Gov',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A237E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 flex flex-col antialiased selection:bg-gov-navy selection:text-white transition-colors duration-200">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
          {children}
        </main>
        {/* Service Worker auto-register script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SIR-Assist ServiceWorker registered with scope:', registration.scope);
                  }).catch(function(err) {
                    console.warn('ServiceWorker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
