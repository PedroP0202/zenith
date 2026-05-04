import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import BottomNav from '../components/BottomNav';
import AuthGuard from '../components/AuthGuard';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '@/utils/constants';
import LangHandler from '../components/LangHandler';
import Onboarding from '../components/Onboarding';
import DailyRewardToast from '../components/DailyRewardToast';
import AppToastHost from '../components/AppToastHost';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
    metadataBase: new URL('https://zenith-app.pages.dev'),
    title: 'Zenith',
    description: 'Forja a tua disciplina. Domina o teu tempo.',
    manifest: '/manifest.json',
    openGraph: {
        title: 'Zenith',
        description: 'Forja a tua disciplina. Domina o teu tempo.',
        url: 'https://zenith-app.pages.dev',
        siteName: 'Zenith',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
            },
        ],
        locale: 'pt-PT',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Zenith',
        description: 'Forja a tua disciplina. Domina o teu tempo.',
        images: ['/og-image.png'],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Zenith',
    },
    icons: {
        apple: '/icons/apple-touch-icon.png',
    },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className="bg-black overscroll-none">
      <head>
        <meta name="google-signin-client_id" content={GOOGLE_CLIENT_ID} />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>
      <body className={`${outfit.className} ${outfit.variable} bg-black font-sans text-white overscroll-none min-h-screen antialiased selection:bg-white/20 selection:text-white`}>
        <LangHandler />
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthGuard>
            <DailyRewardToast />
            <AppToastHost />
            {children}
            <BottomNav />
            <Onboarding />
          </AuthGuard>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
