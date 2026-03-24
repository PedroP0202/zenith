import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-[var(--zenith-active)] to-cyan-400 bg-clip-text text-transparent italic">404</h1>
      <h2 className="text-xl font-bold uppercase tracking-widest mb-8 opacity-40">Destino Não Encontrado</h2>
      <Link 
        href="/" 
        className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
      >
        <Home size={16} />
        Regressar à Órbita
      </Link>
    </div>
  );
}
