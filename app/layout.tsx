import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import BottomNav from '../components/BottomNav';
import AuthGuard from '../components/AuthGuard';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '@/utils/constants';
import LangHandler from '../components/LangHandler';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
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
    <html lang="pt" className="bg-black overscroll-none">
      <head>
        <meta name="google-signin-client_id" content="471890064632-6pehr2hlbfudc3qbf0je5kjpd2bjavlv.apps.googleusercontent.com" />
      </head>
      <body className={`${outfit.className} ${outfit.variable} bg-black font-sans text-white overscroll-none min-h-screen`}>
        <LangHandler />
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthGuard>
            {children}
            <BottomNav />
          </AuthGuard>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}