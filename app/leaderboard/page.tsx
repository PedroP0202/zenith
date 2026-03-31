'use client';

import { useStore } from '../../store/useStore';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Crown, Loader2, Play, ShieldCheck, Orbit, Cloud, Sparkles, Zap, Star, Flame, Target, MoveRight, Wind, Moon, Minus, Calendar, Globe, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/utils/constants';

interface LeaderboardEntry {
    id: string;
    name: string;
    username: string;
    score: number;
}

const TIERS = [
    { name: 'Zenith', min: 2500, color: 'text-white', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bg: 'bg-white/10 ring-1 ring-white/30', icon: Star },
    { name: 'Avatar', min: 1500, color: 'text-purple-300', glow: 'shadow-[0_0_15px_rgba(216,180,254,0.3)]', bg: 'bg-purple-500/10 ring-1 ring-purple-500/20', icon: Crown },
    { name: 'Soberano', min: 900, color: 'text-indigo-400', glow: '', bg: 'bg-indigo-500/10 ring-1 ring-indigo-500/20', icon: ShieldCheck },
    { name: 'Astre', min: 550, color: 'text-blue-300', glow: '', bg: 'bg-blue-300/10 ring-1 ring-blue-300/20', icon: Sparkles },
    { name: 'Pulsar', min: 350, color: 'text-cyan-400', glow: '', bg: 'bg-cyan-500/10 ring-1 ring-cyan-500/20', icon: Zap },
    { name: 'Nova', min: 200, color: 'text-orange-400', glow: '', bg: 'bg-orange-500/10 ring-1 ring-orange-500/20', icon: Flame },
    { name: 'Núcleo', min: 120, color: 'text-emerald-400', glow: '', bg: 'bg-emerald-500/10 ring-1 ring-emerald-500/20', icon: Target },
    { name: 'Órbita', min: 70, color: 'text-zinc-300', glow: '', bg: 'bg-white/[0.05] ring-1 ring-white/10', icon: Orbit },
    { name: 'Vetor', min: 40, color: 'text-zinc-400', glow: '', bg: 'bg-white/[0.03]', icon: MoveRight },
    { name: 'Flux', min: 20, color: 'text-zinc-500', glow: '', bg: 'bg-white/[0.02]', icon: Wind },
    { name: 'Vácuo', min: 5, color: 'text-zinc-600', glow: '', bg: 'bg-white/[0.01]', icon: Moon },
    { name: 'Spark', min: 0, color: 'text-zinc-700', glow: '', bg: 'bg-transparent', icon: Minus },
];

const getTier = (score: number) => TIERS.find(t => score >= t.min) || TIERS[TIERS.length - 1];

export default function LeaderboardPage() {
    const { optInLeaderboard, setOptInLeaderboard, jwt, userName, username: myUsername } = useStore();
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConsent, setShowConsent] = useState(false);
    const [showOptOut, setShowOptOut] = useState(false);
    const [period, setPeriod] = useState<'weekly' | 'seasonal' | 'all'>('seasonal');
    const [season, setSeason] = useState<{id: string, name: string, endsAt: number} | null>(null);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/leaderboard?period=${period}`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(`(${res.status}) ${data?.error || 'Erro desconhecido'}`);
            setLeaderboard(data.leaderboard || []);
            if (data.season) setSeason(data.season);
        } catch (err: any) {
            console.error("[ARENA] Fetch failed:", err);
            setError(err.message || 'Erro ao carregar a arena.');
        } finally {
            setLoading(false);
        }
    }, [jwt, period]);

    useEffect(() => {
        if (optInLeaderboard && jwt) {
            fetchLeaderboard();
        }
    }, [optInLeaderboard, jwt, fetchLeaderboard]);

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
                    <h1 className="text-xl font-black tracking-tight uppercase text-white/90">A Arena</h1>
                    <button onClick={() => setShowOptOut(true)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                        <Globe size={20} />
                    </button>
                </header>

                {optInLeaderboard && !showOptOut && (
                    <div className="flex bg-white/5 rounded-2xl p-1 mb-8 gap-1 relative z-10">
                        {[
                            { id: 'weekly', label: 'Semana', icon: Clock },
                            { id: 'seasonal', label: 'Temporada', icon: Calendar },
                            { id: 'all', label: 'Global', icon: Globe }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setPeriod(t.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${period === t.id ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <t.icon size={12} strokeWidth={3} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

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
                                <div className="space-y-4 pb-20">
                                    {/* Personal Stats Header */}
                                    {leaderboard.length > 0 && (
                                        <div className="mb-6 px-1">
                                            {(() => {
                                                const myEntryIndex = leaderboard.findIndex(e => e.username === myUsername);
                                                const myEntry = myEntryIndex !== -1 ? leaderboard[myEntryIndex] : null;
                                                
                                                if (!myEntry) return null;

                                                const nextEntry = myEntryIndex > 0 ? leaderboard[myEntryIndex - 1] : null;
                                                const tier = getTier(myEntry.score);
                                                
                                                return (
                                                    <div className="flex items-center justify-between p-6 rounded-[2.5rem] bg-gradient-to-br from-white/[0.08] to-transparent border border-white/10 shadow-2xl">
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-0.5">O teu Cosmos</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-base font-black ${tier.color}`}>{tier.name}</span>
                                                                <div className="w-1 h-1 rounded-full bg-white/20" />
                                                                <span className="text-xl font-black tracking-tight">{myEntry.score} pts</span>
                                                            </div>
                                                        </div>
                                                        {nextEntry && (
                                                            <div className="text-right">
                                                                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-0.5">Próximo Rank</p>
                                                                <p className="text-xs font-medium text-white/60">
                                                                    Faltam <span className="text-white font-bold">{(nextEntry.score - myEntry.score) + 1}</span> para o {myEntryIndex}º lugar
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {leaderboard.map((entry, index) => {
                                        const isMe = entry.username === myUsername;
                                        const rank = index + 1;
                                        const tier = getTier(entry.score);
                                        const TierIcon = tier.icon;
                                        
                                        let rankBadge = <span className="font-mono text-lg opacity-30">{rank}</span>;
                                        if (rank === 1) rankBadge = <Crown size={20} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />;
                                        if (rank === 2) rankBadge = <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />;
                                        if (rank === 3) rankBadge = <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />;
                                        
                                        return (
                                            <motion.div 
                                                key={entry.id}
                                                className={`flex items-center justify-between p-5 rounded-[2rem] transition-all border border-transparent ${tier.bg} ${isMe ? 'ring-2 ring-white/20 !bg-white/10 border-white/10' : ''} ${tier.glow}`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: Math.min(index * 0.05, 1) }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 flex justify-center">
                                                        {rankBadge}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-black tracking-tight ${isMe ? 'text-white' : 'text-white/90'}`}>
                                                            {entry.name}
                                                        </span>
                                                        <span className="text-[10px] text-white/30 font-mono">
                                                            @{entry.username || 'user'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-black tracking-tight lowercase">{entry.score} <span className="text-[10px] opacity-30">pts</span></span>
                                                        <span className={`text-[8px] uppercase tracking-widest font-black ${tier.color}`}>{tier.name}</span>
                                                    </div>
                                                    <div className={`p-2 rounded-full bg-white/5 ${tier.color}`}>
                                                        <TierIcon size={14} className={tier.name === 'Zenith' ? 'animate-pulse' : ''} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {season && (
                                        <div className="pt-8 pb-12 text-center">
                                            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-2">{season.name}</p>
                                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                                                <Clock size={12} className="text-white/40" />
                                                <span className="text-xs font-medium text-white/40">
                                                    {(() => {
                                                        const diff = season.endsAt - Date.now();
                                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                        if (days <= 0) return 'Último dia!';
                                                        return \`\${days} \${days === 1 ? 'dia restante' : 'dias restantes'}\`;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
