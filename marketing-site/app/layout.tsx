import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Zenith | Domínio pela Consistência",
  description: "O rastreador de hábitos definitivo para indivíduos de alta performance. Elegância Apple, gamificação social e disciplina absoluta.",
  keywords: "hábitos, produtividade, zenith, disciplina, tracker, apple style, minimalist",
  openGraph: {
    title: "Zenith | Habits for High Performance",
    description: "Minimalist habit tracker with social gamification.",
    url: "https://dronee.blog",
    siteName: "Zenith",
    locale: "pt_PT",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
