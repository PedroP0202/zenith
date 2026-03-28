"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { 
    ChevronLeft, 
    Trophy, 
    Zap, 
    TrendingUp, 
    Calendar, 
    Target,
    Users,
    Activity,
    User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import { getRankForLevel } from "@/utils/progression";
import TrophyWall from "@/components/TrophyWall";
import { getDailyActivityMap, getBestStreak } from "@/utils/streak";

const DAY_LABELS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function FriendProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const username = searchParams.get('u');
    const { jwt, habits, logs, level: myLevel, totalXP: myXP } = useStore();
    const { t, language } = useTranslation();
    
    const [friendData, setFriendData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const DAY_LABELS = language === 'pt' ? DAY_LABELS_PT : DAY_LABELS_EN;

    useEffect(() => {
        setMounted(true);
        if (jwt && username) {
            fetchFriendProfile();
        }
    }, [jwt, username]);

    const fetchFriendProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/users/${username}/profile`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (res.ok) {
                    setFriendData(data);
                } else {
                    setError(data.error || `Erro ${res.status}: Problema no servidor`);
                }
            } else {
                const text = await res.text();
                if (res.status === 404) {
                    setError("O endpoint do perfil ainda não foi encontrado no servidor. Por favor, verifica se a API foi atualizada.");
                } else {
                    setError(`Erro ${res.status}: Resposta inesperada do servidor`);
                }
            }
        } catch (e) {
            setError("Não foi possível contactar o servidor. Verifica a tua ligação.");
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate My Stats for Comparison
    const myStats = useMemo(() => {
        const totalCompletions = logs.length;
        const currentBestStreak = habits.reduce((max, h) => {
            const hLogs = logs.filter(l => l.habitId === h.id);
            return Math.max(max, getBestStreak(hLogs, h.frequency));
        }, 0);

        // Calculate my active weekdays (Day of Week distribution)
        const activeWeekdays = [0, 0, 0, 0, 0, 0, 0];
        logs.forEach(log => {
            const dow = new Date(log.completedAt).getDay();
            activeWeekdays[dow]++;
        });

        return {
            totalCompletions,
            bestStreak: currentBestStreak,
            activeWeekdays
        };
    }, [habits, logs]);

    if (!mounted) return null;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--zenith-active)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center gap-4">
                <p className="text-white/40 font-medium text-center">{error}</p>
                <button 
                    onClick={() => router.back()}
                    className="px-6 py-3 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest"
                >
                    Voltar
                </button>
            </div>
        );
    }

    const friendRank = getRankForLevel(friendData.user.level);
    const myRank = getRankForLevel(myLevel);

    return (
        <main className="min-h-screen bg-black text-white p-6 pb-24 font-sans max-w-md mx-auto relative overflow-x-hidden">
            {/* Background Orb */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-[var(--zenith-active)]/5 blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="flex items-center justify-between mb-8 relative z-10">
                <button 
                    onClick={() => router.back()}
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Perfil Social</span>
                    <span className="text-sm font-bold text-[var(--zenith-active)]">@{friendData.user.username}</span>
                </div>
            </header>

            {/* Profile Intro */}
            <section className="flex flex-col items-center text-center mb-10 relative z-10">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-4xl font-black text-white/20 mb-6 shadow-2xl">
                    {friendData.user.name.charAt(0)}
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">{friendData.user.name}</h1>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--zenith-active)]/10 border border-[var(--zenith-active)]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)] shadow-[0_0_8px_var(--zenith-active)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">
                        {friendRank.name}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--zenith-active)]/50">•</span>
                    <span className="text-[11px] font-black text-[var(--zenith-active)]">Nível {friendData.user.level}</span>
                </div>
            </section>

            <div className="space-y-10">
                {/* Comparison Stats Cards */}
                <section className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex items-center justify-between">
                            <Zap size={16} className="text-[var(--zenith-active)]" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Experiência</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">{friendData.user.totalXp}</span>
                                <span className="text-[10px] font-bold text-white/20 uppercase">ZP</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/30 uppercase">Tu</span>
                                <span className="text-[9px] font-bold text-[var(--zenith-active)]">{myXP} ZP</span>
                            </div>
                            <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[var(--zenith-active)]" 
                                    style={{ width: `${Math.min(100, (myXP / friendData.user.totalXp) * 100)}%` }} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex items-center justify-between">
                            <Target size={16} className="text-white/40" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Focus</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">{friendData.stats.totalCompletions}</span>
                                <span className="text-[10px] font-bold text-white/20 uppercase">Hits</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/30 uppercase">Tu</span>
                                <span className="text-[9px] font-bold text-white/60">{myStats.totalCompletions} Hits</span>
                            </div>
                            <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white/30" 
                                    style={{ width: `${Math.min(100, (myStats.totalCompletions / friendData.stats.totalCompletions) * 100)}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Weekday Comparative Chart */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 font-black">Distribuição Semanal</h2>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)]" />
                                <span className="text-[9px] font-bold text-white/30">ELE</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 border border-white/30 rounded-full" />
                                <span className="text-[9px] font-bold text-white/30">TU</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6">
                        <div className="flex items-end justify-between h-32 gap-3 mb-4">
                            {DAY_LABELS.map((label, i) => {
                                const friendVal = friendData.stats.activeWeekdays[i] || 0;
                                const myVal = myStats.activeWeekdays[i] || 0;
                                const maxVal = Math.max(...friendData.stats.activeWeekdays, ...myStats.activeWeekdays, 1);
                                
                                const friendHeight = (friendVal / maxVal) * 100;
                                const myHeight = (myVal / maxVal) * 100;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                        <div className="w-full flex items-end justify-center gap-1 h-full">
                                            {/* Friend Bar */}
                                            <motion.div 
                                                initial={{ height: 0 }}
                                                animate={{ height: `${friendHeight}%` }}
                                                className="w-full max-w-[12px] bg-gradient-to-t from-[var(--zenith-active)]/40 to-[var(--zenith-active)] rounded-full"
                                            />
                                            {/* My Bar (Wireframe/Subtle) */}
                                            <motion.div 
                                                initial={{ height: 0 }}
                                                animate={{ height: `${myHeight}%` }}
                                                className="w-full max-w-[12px] bg-white/5 border border-white/10 rounded-full"
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-white/20">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Trophy Wall */}
                <TrophyWall unlockedIds={friendData.unlockedTrophies} />

                {/* Arena History */}
                {friendData.arenaHistory.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 font-black px-2">Condecorações de Arena</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {friendData.arenaHistory.map((reward: any, i: number) => (
                                <div 
                                    key={i}
                                    className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col items-center text-center gap-2"
                                >
                                    <Trophy size={20} className={reward.position <= 3 ? "text-yellow-400" : "text-white/40"} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{reward.rank_name}</span>
                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Época {reward.season_id}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}

export default function FriendProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--zenith-active)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <FriendProfileContent />
        </Suspense>
    );
}
