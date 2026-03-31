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
    UserMinus,
    MoreVertical,
    AlertTriangle,
    ShieldAlert,
    BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import { getRankForLevel } from "@/utils/progression";
import TrophyWall from "@/components/TrophyWall";
import { getDailyActivityMap, getBestStreak } from "@/utils/streak";
import UserOrb from "@/components/UserOrb";

const DAY_LABELS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function FriendProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const username = searchParams.get('u');
    const { jwt, habits, logs, level: myLevel, totalXP: myXP, removeFriend } = useStore();
    const { t, language } = useTranslation();
    
    const [friendData, setFriendData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isNudging, setIsNudging] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

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
            if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                if (res.ok) {
                    setFriendData(data);
                } else {
                    setError(data.error || `Erro ${res.status}: Problema no servidor`);
                }
            } else {
                // Not a JSON response, likely a raw 404/500 from the router or worker
                if (res.status === 404) {
                    setError(`O utilizador "@${username}" não foi encontrado ou o servidor não reconhece este endereço.`);
                } else {
                    setError(`Erro ${res.status}: O servidor devolveu uma resposta inesperada.`);
                }
            }
        } catch (e) {
            setError("Não foi possível estabelecer ligação com o servidor Zenith. Verifica a tua internet.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNudge = () => {
        if (isNudging) return;
        setIsNudging(true);
        setNudgeMessage(`Enviaste um incentivo a @${friendData.user.username}! ⚡️`);
        
        // Mocking API call for now
        setTimeout(() => {
            setIsNudging(false);
            setTimeout(() => setNudgeMessage(null), 3000);
        }, 1000);
    };

    const handleAction = (type: string) => {
        setShowOptions(false);
        if (type === 'block') {
            setNudgeMessage(`Utilizador @${friendData.user.username} bloqueado.`);
            setTimeout(() => setNudgeMessage(null), 3000);
        } else if (type === 'report') {
            setNudgeMessage("Denúncia enviada com sucesso. Obrigado.");
            setTimeout(() => setNudgeMessage(null), 3000);
        } else if (type === 'stats') {
            setNudgeMessage("Brevemente: Estatísticas comparativas avançadas.");
            setTimeout(() => setNudgeMessage(null), 3000);
        }
    };

    // Calculate My Stats for Comparison (Last 7 Days)
    const myStats = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() + 1);
        const endOfToday = now.getTime();

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startOf7Days = sevenDaysAgo.getTime();

        const weeklyLogs = logs.filter(l => l.completedAt >= startOf7Days && l.completedAt < endOfToday);
        const weeklyCompletions = weeklyLogs.length;

        // activeWeekdays [day-6, day-5, day-4, day-3, day-2, day-1, today]
        const activeWeekdays = [0, 0, 0, 0, 0, 0, 0];
        weeklyLogs.forEach(log => {
            const logDate = new Date(log.completedAt);
            logDate.setHours(12, 0, 0, 0); // To avoid exact midnight timezone bugs
            const daysDiff = Math.floor((endOfToday - logDate.getTime()) / (1000 * 60 * 60 * 24));
            const arrayIndex = 7 - daysDiff;
            
            if (arrayIndex >= 0 && arrayIndex <= 6) {
                activeWeekdays[arrayIndex]++;
            }
        });

        const totalCompletions = logs.length;

        return {
            totalCompletions,
            weeklyCompletions,
            activeWeekdays
        };
    }, [habits, logs]);

    // Generate dynamic labels for the past 7 days ending in Today
    const dynamicLabels = useMemo(() => {
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dow = d.getDay(); // 0 = Sunday
            
            if (i === 0) {
                labels.push(language === 'pt' ? 'Hoje' : 'Today');
            } else {
                labels.push(DAY_LABELS[dow]);
            }
        }
        return labels;
    }, [language, DAY_LABELS]);

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
            <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-2">
                    <Activity size={32} />
                </div>
                <div className="space-y-2 text-center">
                    <p className="text-white/60 font-medium">{error}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Verifica se a API está online e atualizada</p>
                </div>
                
                <div className="flex flex-col gap-3 w-full max-w-[200px]">
                    <button 
                        onClick={fetchFriendProfile}
                        className="w-full px-6 py-4 bg-[var(--zenith-active)] rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                        Tentar Novamente
                    </button>
                    <button 
                        onClick={() => router.back()}
                        className="w-full px-6 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-white/40 active:scale-95 transition-transform"
                    >
                        Voltar
                    </button>
                </div>

                <details className="mt-8 w-full group">
                    <summary className="text-[9px] text-white/10 uppercase tracking-[0.2em] cursor-pointer text-center list-none group-open:text-white/30">
                        Detalhes do Diagnóstico
                    </summary>
                    <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] font-mono text-white/30 break-all">
                        URL: {API_URL}/users/{username}/profile<br/>
                        User: {username || 'undefined'}<br/>
                        Auth: {jwt ? 'Token Present' : 'Missing Token'}
                    </div>
                </details>
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
            <header className="flex items-center justify-between mb-2 relative z-10">
                <button 
                    onClick={() => router.back()}
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-3 relative">
                    <button 
                        onClick={() => setShowOptions(!showOptions)}
                        className="p-3 text-white/20 hover:text-white/60 transition-colors"
                        title={language === 'pt' ? 'Opções' : 'Options'}
                    >
                        <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                        {showOptions && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowOptions(false)} 
                                />
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5"
                                >
                                    <button 
                                        onClick={() => handleAction('stats')}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        <BarChart3 size={14} />
                                        {language === 'pt' ? 'Estatísticas' : 'Detailed Stats'}
                                    </button>
                                    <button 
                                        onClick={() => handleAction('report')}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        <AlertTriangle size={14} />
                                        {language === 'pt' ? 'Denunciar' : 'Report'}
                                    </button>
                                    <button 
                                        onClick={() => handleAction('block')}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-colors"
                                    >
                                        <ShieldAlert size={14} />
                                        {language === 'pt' ? 'Bloquear' : 'Block'}
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <section className="flex flex-col items-center text-center mb-8 relative z-10">
                <div className="relative mb-6">
                    {/* Glow behind orb */}
                    <div className="absolute inset-0 bg-white/20 blur-[40px] rounded-full" />
                    <UserOrb 
                        seed={friendData.user.username} 
                        size={100} 
                        animate={true} 
                        className="shadow-[0_0_60px_rgba(255,255,255,0.1)] border border-white/10" 
                    />
                </div>
                <h1 className="text-3xl font-black tracking-tight leading-none mb-1">{friendData.user.name}</h1>
                <span className="text-sm font-bold text-[var(--zenith-active)] mb-4">@{friendData.user.username}</span>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)] shadow-[0_0_8px_var(--zenith-active)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
                        {friendRank.name}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--zenith-active)]/50">•</span>
                    <span className="text-[11px] font-black text-white/40">Lvl {friendData.user.level}</span>
                </div>

                {/* Primary Social Actions */}
                <div className="flex items-center gap-3 w-full max-w-[280px] mt-6">
                    <button 
                        onClick={async () => {
                            if (confirm(t.social.confirmRemove || `Tens a certeza que queres remover @${friendData.user.username}?`)) {
                                const res = await removeFriend(friendData.user.id);
                                if (res.success) router.replace('/friends');
                            }
                        }}
                        className="flex-1 py-3.5 px-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 transition-all group shadow-sm active:scale-95"
                    >
                        <span className="text-sm font-bold text-white group-hover:text-red-500 transition-colors">
                            {language === 'pt' ? 'Amigos' : 'Friends'}
                        </span>
                        <ChevronLeft size={16} className="rotate-[-90deg] text-white/40 group-hover:hidden" />
                        <UserMinus size={16} className="text-red-500 hidden group-hover:block" />
                    </button>
                    <button 
                        onClick={handleNudge}
                        disabled={isNudging}
                        className={`h-[52px] w-[52px] flex items-center justify-center rounded-2xl transition-all ${isNudging ? 'bg-zinc-800 scale-95' : 'bg-[var(--zenith-active)] shadow-[0_4px_20px_var(--zenith-active)] active:scale-95 hover:scale-105'}`}
                    >
                        <motion.div
                            animate={isNudging ? { scale: [1, 1.5, 1], rotate: [0, 20, -20, 0] } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            <Zap size={20} className={isNudging ? "text-white/20" : "text-black"} />
                        </motion.div>
                    </button>
                </div>

                {/* Nudge Feedback Toast */}
                <AnimatePresence>
                    {nudgeMessage && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[100] flex items-center gap-3"
                        >
                            <div className="p-1.5 bg-[var(--zenith-active)]/10 rounded-lg">
                                <Zap size={14} className="text-[var(--zenith-active)]" />
                            </div>
                            <span className="text-xs font-bold text-white/80 whitespace-nowrap">{nudgeMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            <div className="space-y-10">
                {/* Comparison Stats Cards */}
                <section className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => {
                            setNudgeMessage(`${friendData.user.totalXp} XP acumulado desde a criação da conta.`);
                            setTimeout(() => setNudgeMessage(null), 3000);
                        }}
                        className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden group text-left active:scale-95 transition-all hover:bg-white/10"
                    >
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
                    </button>

                    <button 
                        onClick={() => {
                            setNudgeMessage(`Hits concluídos nos últimos 7 dias (incluindo hoje).`);
                            setTimeout(() => setNudgeMessage(null), 3000);
                        }}
                        className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden group text-left active:scale-95 transition-all hover:bg-white/10"
                    >
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex items-center justify-between">
                            <Activity size={16} className="text-white/40" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{language === 'pt' ? 'Últimos 7 Dias' : 'Last 7 Days'}</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">{friendData.stats.weeklyCompletions || 0}</span>
                                <span className="text-[10px] font-bold text-white/20 uppercase">Hits</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/30 uppercase">Tu</span>
                                <span className="text-[9px] font-bold text-white/60">{myStats.weeklyCompletions}</span>
                            </div>
                            <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white/30" 
                                    style={{ width: `${Math.min(100, (myStats.weeklyCompletions / (friendData.stats.weeklyCompletions || 1)) * 100)}%` }} 
                                />
                            </div>
                        </div>
                    </button>
                </section>

            {/* 7-Day Comparative Chart */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex flex-col">
                            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 font-black">Performance</h2>
                            <span className="text-[10px] text-[var(--zenith-active)] font-bold mt-1">
                                {myStats.weeklyCompletions > friendData.stats.weeklyCompletions 
                                    ? (language === 'pt' ? 'Estás na liderança (7d)' : 'You are leading (7d)') 
                                    : myStats.weeklyCompletions < friendData.stats.weeklyCompletions
                                        ? (language === 'pt' ? 'A ficar para trás (7d)' : 'Falling behind (7d)')
                                        : (language === 'pt' ? 'Atividade empatada (7d)' : 'Tied activity (7d)')
                                }
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)] shadow-[0_0_8px_var(--zenith-active)]" />
                                <span className="text-[9px] font-bold text-white">TU</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 backdrop-blur-sm" />
                                <span className="text-[9px] font-bold text-white/30">ELE</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6">
                        <div className="flex items-end justify-between h-36 gap-2 mb-2">
                            {dynamicLabels.map((label, i) => {
                                const friendVal = friendData.stats.activeWeekdays[i] || 0;
                                const myVal = myStats.activeWeekdays[i] || 0;
                                const maxVal = Math.max(...friendData.stats.activeWeekdays, ...myStats.activeWeekdays, 1);
                                
                                const friendHeight = (friendVal / maxVal) * 100;
                                const myHeight = (myVal / maxVal) * 100;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                        <div className="w-full flex items-end justify-center gap-[4px] h-full group relative">
                                            {/* Tooltip on hover (desktop mainly, but good practice) */}
                                            <div className="absolute -top-6 bg-black text-white text-[9px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                                Tu: {myVal} | Ele: {friendVal}
                                            </div>

                                            {/* Friend Bar (Glassmorphism Behind) */}
                                            <motion.div 
                                                initial={{ height: 0 }}
                                                animate={{ height: `${Math.max(4, friendHeight)}%` }}
                                                className="w-full max-w-[12px] bg-white/[0.08] backdrop-blur-sm rounded-full relative z-0"
                                            />
                                            {/* My Bar (Glowing Active Foreground) */}
                                            <motion.div 
                                                initial={{ height: 0 }}
                                                animate={{ height: `${Math.max(4, myHeight)}%` }}
                                                className="w-full max-w-[12px] bg-gradient-to-t from-[var(--zenith-active)]/40 to-[var(--zenith-active)] shadow-[0_4px_16px_var(--zenith-active)] rounded-full relative z-10"
                                            />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${i === 6 ? 'text-[var(--zenith-active)]' : 'text-white/30'}`}>{label}</span>
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
