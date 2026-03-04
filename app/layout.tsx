import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNav from '../components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

import AuthGuard from '../components/AuthGuard';

export const metadata: Metadata = {
  title: 'Zenith',
  description: 'Forja a tua disciplina. Domina o teu tempo.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Zenith',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-black overscroll-none">
      <body className={`${inter.className} bg-black text-white overscroll-none min-h-screen`}>
        <AuthGuard>
          {children}
          <BottomNav />
        </AuthGuard>
      </body>
    </html>
  );
}