import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNav from '../components/BottomNav';
import AuthGuard from '../components/AuthGuard';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '@/utils/constants';
import LangHandler from '../components/LangHandler';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="pt" className="bg-black overscroll-none">
      <head>
        <meta name="google-signin-client_id" content="471890064632-6pehr2hlbfudc3qbf0je5kjpd2bjavlv.apps.googleusercontent.com" />
      </head>
      <body className={`${inter.className} bg-black text-white overscroll-none min-h-screen`}>
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