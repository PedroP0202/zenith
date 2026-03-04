'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2 } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    // Hide on detail or creation pages to keep them focused
    if (pathname.includes('/habit/')) return null;

    return (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#111111]/90 backdrop-blur-md border border-white/10 rounded-full px-6 py-4 flex items-center gap-8 z-50">
            <Link
                href="/"
                className={`transition-colors duration-300 ${pathname === '/' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                aria-label="Hoje"
            >
                <Home size={24} strokeWidth={pathname === '/' ? 2.5 : 2} />
            </Link>

            <Link
                href="/stats"
                className={`transition-colors duration-300 ${pathname === '/stats' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                aria-label="Estatísticas"
            >
                <BarChart2 size={24} strokeWidth={pathname === '/stats' ? 2.5 : 2} />
            </Link>
        </nav>
    );
}
