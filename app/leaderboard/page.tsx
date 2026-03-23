'use client';

import { useStore } from '../../store/useStore';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Crown, Loader2, Play, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/utils/constants';

interface LeaderboardEntry {
    id: string;
    name: string;
    score: number;
}

export default function LeaderboardPage() {
    const { optInLeaderboard, setOptInLeaderboard, jwt, userName } = useStore();
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConsent, setShowConsent] = useState(false);
    const [showOptOut, setShowOptOut] = useState(false);

    useEffect(() => {
        if (optInLeaderboard && jwt) {
            fetchLeaderboard();
        }
    }, [optInLeaderboard, jwt]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/leaderboard`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            if (!res.ok) throw new Error('Falha ao aceder à Arena.');
            const data = await res.json();
            setLeaderboard(data.leaderboard);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOptIn = () => {
        setOptInLeaderboard(true);
        setShowConsent(false);
    };

    const handleOptOut = () => {
        setOptInLeaderboard(false);
        setShowOptOut(false);
        setShowConsent(false);
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-24 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8 flex flex-col h-full min-h-[85vh]">
                <header className="flex justify-between items-center mb-10">
                    <button
                        onClick={() => router.back()}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors -ml-3 active:scale-90"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-medium tracking-tight text-white/50">A Arena</h1>
                    <div className="w-12" />
                </header>

                <AnimatePresence mode="wait">
                    {!optInLeaderboard && !showConsent && (
                        <motion.div 
                            key="gate"
                            className="flex-1 flex flex-col items-center justify-center text-center px-4"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.5, type: 'spring' }}
                        >
                            <Trophy size={48} className="text-white/20 mb-6" strokeWidth={1} />
                            <h2 className="text-3xl font-medium tracking-tight mb-4">Entrar na Arena</h2>
                            <p className="text-white/40 mb-12 text-sm max-w-[280px] leading-relaxed">
                                Compara a tua dedicação com outros e descobre quem atinge o Zenith. Ao entrar, o teu nome e pontuação global serão visíveis.
                            </p>
                            <button
                                onClick={() => setShowConsent(true)}
                                className="bg-white text-black font-bold px-8 py-4 rounded-full flex items-center gap-3 transition-all hover:-translate-y-0.5 active:scale-95 shadow-glow-white hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]"
                            >
                                <Play size={18} fill="currentColor" />
                                Juntar à Arena
                            </button>
                        </motion.div>
                    )}

                    {!optInLeaderboard && showConsent && (
                        <motion.div
                            key="consent"
                            className="flex-1 flex flex-col items-start justify-center px-4"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.4, type: 'spring' }}
                        >
                            <ShieldCheck size={32} className="text-white/40 mb-8" strokeWidth={1.5} />
                            <h2 className="text-2xl font-medium tracking-tight mb-3">Antes de entrares</h2>
                            <p className="text-white/40 text-sm leading-relaxed mb-10">
                                Ao juntares-te à Arena, estás a concordar com o seguinte:
                            </p>
                            <ul className="space-y-4 mb-12 w-full">
                                {[
                                    { icon: '👤', text: 'O teu nome será visível para todos os utilizadores da Arena.' },
                                    { icon: '🏆', text: 'A tua pontuação (número de hábitos completos) será pública.' },
                                    { icon: '👁', text: 'Verás os nomes e pontuações de outros utilizadores que participem.' },
                                    { icon: '🚪', text: 'Podes sair a qualquer momento. O teu perfil ficará imediatamente invisível.' },
                                ].map((item, i) => (
                                    <motion.li
                                        key={i}
                                        className="flex items-start gap-4 text-sm text-white/60"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * i }}
                                    >
                                        <span className="w-7 shrink-0 text-center text-base mt-px">{item.icon}</span>
                                        <span className="leading-relaxed">{item.text}</span>
                                    </motion.li>
                                ))}
                            </ul>
                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={handleOptIn}
                                    className="bg-white text-black font-bold px-8 py-4 rounded-full flex items-center justify-center gap-3 transition-all active:scale-95"
                                >
                                    Concordo — Entrar
                                </button>
                                <button
                                    onClick={() => setShowConsent(false)}
                                    className="text-white/30 text-sm py-3 hover:text-white/60 transition-colors text-center"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    )}
                    {optInLeaderboard && showOptOut && (
                        <motion.div
                            key="optout"
                            className="flex-1 flex flex-col items-start justify-center px-4"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.4, type: 'spring' }}
                        >
                            <span className="text-4xl mb-8">🚪</span>
                            <h2 className="text-2xl font-medium tracking-tight mb-3">Sair da Arena?</h2>
                            <p className="text-white/40 text-sm leading-relaxed mb-10">
                                Se saíres, o teu nome e pontuação deixarão de ser visíveis para outros utilizadores imediatamente. Podes reentrar quando quiseres, mas os teus dados escolhidos voltarão a ser públicos.
                            </p>
                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={handleOptOut}
                                    className="bg-red-500/10 text-red-400 border border-red-500/20 font-bold px-8 py-4 rounded-full transition-all active:scale-95 hover:bg-red-500/20"
                                >
                                    Confirmar Saída
                                </button>
                                <button
                                    onClick={() => setShowOptOut(false)}
                                    className="text-white/30 text-sm py-3 hover:text-white/60 transition-colors text-center"
                                >
                                    Ficar na Arena
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {optInLeaderboard && !showOptOut && (
                        <motion.div
                            key="leaderboard"
                            className="flex-1 flex flex-col"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="flex-1 flex items-center justify-center flex-col gap-4 text-white/40">
                                    <p>{error}</p>
                                    <button onClick={fetchLeaderboard} className="text-sm underline">Tentar Novamente</button>
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                                    A arena está vazia de momento.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.map((entry, index) => {
                                        const isMe = entry.name === userName;
                                        const rank = index + 1;
                                        
                                        let rankColor = "text-white/40";
                                        let rankBadge = <span className="font-mono text-lg opacity-50">{rank}</span>;
                                        let containerBg = isMe ? "bg-white/10 border border-white/20" : "bg-white/[0.02]";
                                        
                                        if (rank === 1) {
                                            rankColor = "text-yellow-500";
                                            rankBadge = <Crown size={20} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />;
                                            containerBg = isMe ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-gradient-to-r from-yellow-500/5 to-transparent border border-yellow-500/10";
                                        } else if (rank === 2) {
                                            rankColor = "text-zinc-300";
                                            rankBadge = <span className="font-mono text-lg text-zinc-300 font-bold">2</span>;
                                        } else if (rank === 3) {
                                            rankColor = "text-amber-600";
                                            rankBadge = <span className="font-mono text-lg text-amber-600 font-bold">3</span>;
                                        }

                                        return (
                                            <motion.div 
                                                key={entry.id}
                                                className={`flex items-center justify-between p-4 rounded-3xl ${containerBg}`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: Math.min(index * 0.05, 1) }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 flex justify-center">
                                                        {rankBadge}
                                                    </div>
                                                    <span className={`font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
                                                        {entry.name} {isMe && <span className="text-[10px] text-white/40 ml-2 uppercase">(Tu)</span>}
                                                    </span>
                                                </div>
                                                <span className={`font-mono text-lg font-bold tracking-tighter ${rankColor}`}>
                                                    {entry.score}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
