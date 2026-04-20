"use client";

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { 
    ChevronLeft, 
    Trophy, 
    Zap, 
    Activity,
    UserMinus,
    MoreVertical,
    AlertTriangle,
    ShieldAlert,
    BarChart3,
    Check,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import { getRankForLevel } from "@/utils/progression";
import TrophyWall from "@/components/TrophyWall";
import UserOrb from "@/components/UserOrb";
import type { ArenaReward, FriendProfileData } from "@/types";
import type { Language } from "@/locales";

const DAY_LABELS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Toast Component ─────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error' | 'info'; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500);
        return () => clearTimeout(t);
    }, [onDismiss]);

    const colors = {
        success: 'border-green-500/30 bg-green-500/10',
        error: 'border-red-500/30 bg-red-500/10',
        info: 'border-[var(--zenith-active)]/30 bg-[var(--zenith-active)]/10',
    };
    const icons = {
        success: <Check size={14} className="text-green-400" />,
        error: <X size={14} className="text-red-400" />,
        info: <Zap size={14} className="text-[var(--zenith-active)]" />,
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl ${colors[type]}`}
            onClick={onDismiss}
        >
            <div className="shrink-0 w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center">
                {icons[type]}
            </div>
            <span className="text-[13px] font-semibold text-white/90 leading-tight">{message}</span>
        </motion.div>
    );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ username, userId, jwt, onClose, onSuccess }: {
    username: string; userId: string; jwt: string; onClose: () => void; onSuccess: () => void;
}) {
    const reasons = [
        'Comportamento abusivo',
        'Conteúdo inapropriado',
        'Spam ou fraude',
        'Identidade falsa',
        'Outra razão',
    ];
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportedUserId: userId, reason: selected }),
            });
            if (res.ok) { onSuccess(); onClose(); }
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-t-[2rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                <h2 className="text-base font-black text-white mb-1">Denunciar @{username}</h2>
                <p className="text-xs text-white/40 mb-6">Seleciona o motivo da denúncia.</p>
                <div className="space-y-2 mb-6">
                    {reasons.map(r => (
                        <button
                            key={r}
                            onClick={() => setSelected(r)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-semibold transition-all border ${
                                selected === r
                                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                    : 'bg-white/[0.03] border-white/5 text-white/60 hover:bg-white/5'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!selected || loading}
                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all bg-red-500/20 text-red-400 border border-red-500/30 disabled:opacity-30 active:scale-95"
                >
                    {loading ? 'A enviar...' : 'Denunciar Utilizador'}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Block Confirm Modal ───────────────────────────────────────────────────────
function BlockModal({ username, userId, jwt, onClose, onSuccess }: {
    username: string; userId: string; jwt: string; onClose: () => void; onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleBlock = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/friends/block`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockedUserId: userId }),
            });
            if (res.ok) { onSuccess(); onClose(); }
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-t-[2rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-14 h-14 bg-red-500/10 rounded-3xl flex items-center justify-center mb-4">
                        <ShieldAlert size={24} className="text-red-400" />
                    </div>
                    <h2 className="text-base font-black text-white mb-2">Bloquear @{username}?</h2>
                    <p className="text-xs text-white/40 leading-relaxed max-w-[240px]">
                        Esta ação remove a amizade e impede qualquer interação futura. Podes desbloquear nas definições.
                    </p>
                </div>
                <div className="space-y-3">
                    <button
                        onClick={handleBlock}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-red-500 text-white disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {loading ? 'A bloquear...' : 'Confirmar Bloqueio'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl text-sm font-semibold text-white/40 bg-white/[0.03] border border-white/5 active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Stats Modal ──────────────────────────────────────────────────────────────
function StatsModal({ friendData, myXP, myLevel, language, onClose }: {
    friendData: FriendProfileData; myXP: number; myLevel: number; language: Language; onClose: () => void;
}) {
    const friendRank = getRankForLevel(friendData.user.level);
    const myRank = getRankForLevel(myLevel);
    const friendXp = friendData.user.totalXp || 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-t-[2rem] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))]"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                <h2 className="text-base font-black text-white mb-6">Comparação de Estatísticas</h2>
                
                <div className="space-y-4">
                    {/* XP Comparison */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                        <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Experiência Total</div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40">Tu</span>
                                <span className="text-xl font-black text-[var(--zenith-active)]">{myXP} <span className="text-xs font-bold text-white/30">ZP</span></span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-white/40">@{friendData.user.username}</span>
                                <span className="text-xl font-black text-white">{friendXp} <span className="text-xs font-bold text-white/30">ZP</span></span>
                            </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[var(--zenith-active)]/40 to-[var(--zenith-active)] rounded-full" style={{ width: `${Math.min(100, friendXp > 0 ? (myXP / friendXp) * 100 : 100)}%` }} />
                        </div>
                    </div>

                    {/* Level Comparison */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">O teu nível</div>
                            <div className="text-3xl font-black text-[var(--zenith-active)]">{myLevel}</div>
                            <div className="text-[10px] font-bold text-white/30 mt-1">{myRank.name}</div>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Nível deles</div>
                            <div className="text-3xl font-black text-white">{friendData.user.level}</div>
                            <div className="text-[10px] font-bold text-white/30 mt-1">{friendRank.name}</div>
                        </div>
                    </div>

                    {/* Check-ins Comparison */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                        <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Check-ins 7 dias</div>
                        <div className="flex items-center justify-between">
                            <span className="text-[var(--zenith-active)] font-black text-sm">Tu: —</span>
                            <span className="text-white font-black text-sm">Eles: {friendData.stats.weeklyCompletions}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="mt-6 w-full py-4 rounded-2xl text-sm font-semibold text-white/40 bg-white/[0.03] border border-white/5 active:scale-95 transition-all"
                >
                    Fechar
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Profile Content ──────────────────────────────────────────────────────
function FriendProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const username = searchParams.get('u');
    const { jwt, logs, level: myLevel, totalXP: myXP, removeFriend } = useStore();
    const { language } = useTranslation();
    
    const [friendData, setFriendData] = useState<FriendProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isNudging, setIsNudging] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    const DAY_LABELS = language === 'pt' ? DAY_LABELS_PT : DAY_LABELS_EN;

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const fetchFriendProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/users/${username}/profile`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = (await res.json().catch(() => ({}))) as Partial<FriendProfileData> & { error?: string };
                if (res.ok && data.user && data.stats && data.arenaHistory && data.unlockedTrophies) {
                    setFriendData(data as FriendProfileData);
                } else if (res.ok) {
                    setError("Formato de perfil inválido.");
                } else {
                    setError(data.error || `Erro ${res.status}`);
                }
            } else {
                setError(res.status === 404 ? `Utilizador "@${username}" não encontrado.` : `Erro ${res.status}`);
            }
        } catch {
            setError("Sem ligação ao servidor Zenith.");
        } finally {
            setIsLoading(false);
        }
    }, [jwt, username]);

    useEffect(() => {
        setMounted(true);
        if (jwt && username) fetchFriendProfile();
    }, [jwt, username, fetchFriendProfile]);

    const handleNudge = async () => {
        if (isNudging || !friendData) return;
        setIsNudging(true);
        try {
            const res = await fetch(`${API_URL}/friends/nudge`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: friendData.user.id }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`⚡ Incentivo enviado a @${friendData.user.username}!`, 'info');
            } else if (res.status === 429) {
                showToast(data.error || 'Já enviaste um incentivo recentemente.', 'error');
            } else {
                showToast(data.error || 'Erro ao enviar incentivo.', 'error');
            }
        } catch {
            showToast('Sem ligação ao servidor.', 'error');
        } finally {
            setTimeout(() => setIsNudging(false), 1000);
        }
    };

    // Compute my stats for comparison
    const myStats = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() + 1);
        const endOfToday = now.getTime();
        const startOf7Days = endOfToday - 7 * 24 * 60 * 60 * 1000;

        const weeklyLogs = logs.filter(l => l.completedAt >= startOf7Days && l.completedAt < endOfToday);
        const activeWeekdays = [0, 0, 0, 0, 0, 0, 0];
        weeklyLogs.forEach(log => {
            const logDate = new Date(log.completedAt);
            logDate.setHours(12, 0, 0, 0);
            const daysDiff = Math.floor((endOfToday - logDate.getTime()) / (1000 * 60 * 60 * 24));
            const arrayIndex = 6 - daysDiff;
            if (arrayIndex >= 0 && arrayIndex <= 6) activeWeekdays[arrayIndex]++;
        });
        return { weeklyCompletions: weeklyLogs.length, activeWeekdays };
    }, [logs]);

    const dynamicLabels = useMemo(() => {
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dow = d.getDay();
            labels.push(i === 0 ? (language === 'pt' ? 'Hoje' : 'Today') : DAY_LABELS[dow]);
        }
        return labels;
    }, [language, DAY_LABELS]);

    if (!mounted) return null;

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--zenith-active)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[100dvh] bg-black text-white px-6 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500">
                    <Activity size={28} />
                </div>
                <p className="text-white/60 font-medium text-center text-sm">{error}</p>
                <div className="flex flex-col gap-3 w-full max-w-[200px]">
                    <button onClick={fetchFriendProfile} className="w-full py-4 bg-[var(--zenith-active)] rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-transform text-black">
                        Tentar Novamente
                    </button>
                    <button onClick={() => router.back()} className="w-full py-4 bg-white/5 rounded-2xl text-sm font-bold text-white/40 active:scale-95 transition-transform">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    if (!friendData) {
        return (
            <div className="min-h-[100dvh] bg-black text-white px-6 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/40">
                    <Activity size={28} />
                </div>
                <p className="text-white/60 font-medium text-center text-sm">
                    Não foi possível carregar o perfil deste utilizador.
                </p>
                <button
                    onClick={() => router.back()}
                    className="w-full max-w-[200px] py-4 bg-white/5 rounded-2xl text-sm font-bold text-white/40 active:scale-95 transition-transform"
                >
                    Voltar
                </button>
            </div>
        );
    }

    const friendRank = getRankForLevel(friendData.user.level);

    return (
        <>
            <main className="min-h-[100dvh] w-full bg-black text-white font-sans relative overflow-x-hidden">
                {/* Ambient Glow */}
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-[var(--zenith-active)]/5 blur-[100px] pointer-events-none z-0" />

                {/* ── Header ── */}
                <header className="sticky top-0 z-50 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 bg-black/80 backdrop-blur-xl border-b border-white/[0.04]">
                    <button
                        onClick={() => router.back()}
                        className="p-3 -ml-1 bg-white/5 rounded-full active:scale-90 transition-transform"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <span className="text-sm font-bold text-white/60 truncate max-w-[160px]">@{username}</span>

                    {/* Options Button */}
                    <div className="relative" ref={optionsRef}>
                        <button
                            onClick={() => setShowOptions(v => !v)}
                            className="p-3 -mr-1 rounded-full active:scale-90 transition-transform"
                            aria-label="Opções"
                        >
                            <MoreVertical size={20} className="text-white/50" />
                        </button>

                        <AnimatePresence>
                            {showOptions && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.92, y: -8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.92, y: -8 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                        className="absolute right-0 top-full mt-2 w-52 z-50 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1.5"
                                    >
                                        <button
                                            onClick={() => { setShowOptions(false); setShowStatsModal(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            <BarChart3 size={15} className="text-white/40" />
                                            {language === 'pt' ? 'Estatísticas' : 'Detailed Stats'}
                                        </button>
                                        <div className="h-px bg-white/[0.04] mx-3 my-1" />
                                        <button
                                            onClick={() => { setShowOptions(false); setShowReportModal(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            <AlertTriangle size={15} className="text-orange-400/60" />
                                            {language === 'pt' ? 'Denunciar' : 'Report'}
                                        </button>
                                        <button
                                            onClick={() => { setShowOptions(false); setShowBlockModal(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                                        >
                                            <ShieldAlert size={15} />
                                            {language === 'pt' ? 'Bloquear' : 'Block'}
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                {/* ── Scrollable Body ── */}
                <div className="relative z-10 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-6">

                    {/* ── Profile Hero ── */}
                    <section className="flex flex-col items-center text-center pt-6 pb-2">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-white/20 blur-[50px] rounded-full scale-75" />
                            <UserOrb
                                seed={friendData.user.username}
                                size={88}
                                animate={true}
                                className="shadow-[0_0_40px_rgba(255,255,255,0.08)] border border-white/10 relative z-10"
                            />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight leading-none mb-1">{friendData.user.name}</h1>
                        <span className="text-xs font-bold text-[var(--zenith-active)] mb-4">@{friendData.user.username}</span>

                        {/* Rank Badge */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)] shadow-[0_0_6px_var(--zenith-active)]" />
                            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">{friendRank.name}</span>
                            <span className="text-[11px] text-white/20">•</span>
                            <span className="text-[11px] font-black text-white/40">Lvl {friendData.user.level}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 w-full max-w-[300px]">
                            {/* Remove Friend */}
                            <button
                                onClick={async () => {
                                    if (confirm(`Remover @${friendData.user.username}?`)) {
                                        const res = await removeFriend(friendData.user.id);
                                        if (res.success) router.replace('/friends');
                                    }
                                }}
                                className="flex-1 py-3.5 px-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 transition-all group active:scale-95"
                            >
                                <span className="text-sm font-bold text-white/70 group-hover:text-red-400 transition-colors">
                                    {language === 'pt' ? 'Amigos' : 'Friends'}
                                </span>
                                <UserMinus size={15} className="text-white/30 group-hover:text-red-400 transition-colors" />
                            </button>

                            {/* Nudge/Zap Button */}
                            <button
                                onClick={handleNudge}
                                disabled={isNudging}
                                className={`h-[52px] w-[52px] flex-shrink-0 flex items-center justify-center rounded-2xl transition-all ${
                                    isNudging
                                        ? 'bg-zinc-800 scale-95'
                                        : 'bg-[var(--zenith-active)] shadow-[0_4px_24px_var(--zenith-active)] active:scale-90 hover:shadow-[0_6px_32px_var(--zenith-active)]'
                                }`}
                            >
                                <motion.div
                                    animate={isNudging ? { scale: [1, 1.6, 1], rotate: [0, 25, -25, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                >
                                    <Zap size={20} className={isNudging ? "text-white/20" : "text-black"} fill={isNudging ? "none" : "currentColor"} />
                                </motion.div>
                            </button>
                        </div>
                    </section>

                    {/* ── Stats Grid ── */}
                    <section className="grid grid-cols-2 gap-3">
                        {/* XP Card */}
                        <div className="bg-white/[0.04] border border-white/5 rounded-3xl p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Zap size={14} className="text-[var(--zenith-active)]" />
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">XP</span>
                            </div>
                            <div>
                                <div className="text-xl font-black tabular-nums">{friendData.user.totalXp || 0}</div>
                                <div className="text-[9px] font-bold text-white/20 uppercase mt-0.5">ZP Total</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-white/30 uppercase font-black">Tu</span>
                                    <span className="text-[9px] font-bold text-[var(--zenith-active)]">{myXP} ZP</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--zenith-active)] rounded-full"
                                        style={{ width: `${Math.min(100, (friendData.user.totalXp || 0) > 0 ? (myXP / (friendData.user.totalXp || 1)) * 100 : 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Weekly Card */}
                        <div className="bg-white/[0.04] border border-white/5 rounded-3xl p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Activity size={14} className="text-white/40" />
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">7 dias</span>
                            </div>
                            <div>
                                <div className="text-xl font-black tabular-nums">{friendData.stats.weeklyCompletions || 0}</div>
                                <div className="text-[9px] font-bold text-white/20 uppercase mt-0.5">Hits</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-white/30 uppercase font-black">Tu</span>
                                    <span className="text-[9px] font-bold text-white/60">{myStats.weeklyCompletions}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white/30 rounded-full"
                                        style={{ width: `${Math.min(100, (friendData.stats.weeklyCompletions || 0) > 0 ? (myStats.weeklyCompletions / (friendData.stats.weeklyCompletions || 1)) * 100 : 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 7-Day Chart ── */}
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div>
                                <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Performance</h2>
                                <span className="text-[10px] text-[var(--zenith-active)] font-bold">
                                    {myStats.weeklyCompletions > (friendData.stats.weeklyCompletions || 0)
                                        ? (language === 'pt' ? '↑ Estás na liderança' : '↑ You are leading')
                                        : myStats.weeklyCompletions < (friendData.stats.weeklyCompletions || 0)
                                            ? (language === 'pt' ? '↓ A ficar para trás' : '↓ Falling behind')
                                            : (language === 'pt' ? '= Empatados' : '= Tied')}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)]" />
                                    <span className="text-[9px] font-bold text-white/50">TU</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    <span className="text-[9px] font-bold text-white/30">ELE</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart or empty state */}
                        {(() => {
                            const friendWeekdays: number[] = Array.isArray(friendData.stats?.activeWeekdays) 
                                ? friendData.stats.activeWeekdays 
                                : [0, 0, 0, 0, 0, 0, 0];
                            const myWeekdays = myStats.activeWeekdays;
                            const hasAnyData = friendWeekdays.some(v => v > 0) || myWeekdays.some(v => v > 0);

                            if (!hasAnyData) {
                                return (
                                    <div className="bg-white/[0.04] border border-white/5 rounded-[2rem] p-8 flex flex-col items-center gap-3 text-center">
                                        <Activity size={24} className="text-white/15" />
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                            {language === 'pt' ? 'Sem dados esta semana' : 'No data this week'}
                                        </p>
                                        <p className="text-[9px] text-white/15">
                                            {language === 'pt' 
                                                ? 'Os dados aparecem após sincronização' 
                                                : 'Data appears after cloud sync'}
                                        </p>
                                    </div>
                                );
                            }

                            const maxVal = Math.max(...friendWeekdays, ...myWeekdays, 1);

                            return (
                                <div className="bg-white/[0.04] border border-white/5 rounded-[2rem] p-5">
                                    <div className="flex items-end justify-between h-28 gap-1.5">
                                        {dynamicLabels.map((label, i) => {
                                            const friendVal = friendWeekdays[i] || 0;
                                            const myVal = myWeekdays[i] || 0;
                                            const friendH = friendVal > 0 ? Math.max(8, (friendVal / maxVal) * 100) : 4;
                                            const myH = myVal > 0 ? Math.max(8, (myVal / maxVal) * 100) : 4;
                                            const isToday = i === 6;

                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="w-full flex items-end justify-center gap-[3px] h-full">
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${friendH}%` }}
                                                            transition={{ delay: i * 0.04, duration: 0.5, ease: 'easeOut' }}
                                                            className={`w-full max-w-[10px] rounded-full ${friendVal > 0 ? 'bg-white/[0.15]' : 'bg-white/[0.04]'}`}
                                                        />
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${myH}%` }}
                                                            transition={{ delay: i * 0.04 + 0.05, duration: 0.5, ease: 'easeOut' }}
                                                            className={`w-full max-w-[10px] rounded-full ${myVal > 0 
                                                                ? 'bg-gradient-to-t from-[var(--zenith-active)]/50 to-[var(--zenith-active)] shadow-[0_2px_12px_var(--zenith-active)]' 
                                                                : 'bg-[var(--zenith-active)]/10'}`}
                                                        />
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase tracking-wide ${isToday ? 'text-[var(--zenith-active)]' : 'text-white/25'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </section>

                    {/* ── Trophy Wall ── */}
                    <TrophyWall unlockedIds={friendData.unlockedTrophies} />

                    {/* ── Arena History ── */}
                    {friendData.arenaHistory.length > 0 && (
                        <section>
                            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black px-1 mb-3">Condecorações de Arena</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {friendData.arenaHistory.map((reward: ArenaReward, i: number) => (
                                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
                                        <Trophy size={18} className={(reward.position || 0) <= 3 ? "text-yellow-400" : "text-white/30"} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{reward.rank_name}</span>
                                        <span className="text-[9px] font-bold text-white/20">{reward.season_name || `Época ${reward.season_id}`}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* ── Global Toast ── */}
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 flex justify-center z-[300] pointer-events-none">
                <div className="pointer-events-auto max-w-sm w-full">
                    <AnimatePresence>
                        {toast && (
                            <Toast
                                key={toast.message}
                                message={toast.message}
                                type={toast.type}
                                onDismiss={() => setToast(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showReportModal && friendData && jwt && (
                    <ReportModal
                        username={friendData.user.username}
                        userId={friendData.user.id}
                        jwt={jwt}
                        onClose={() => setShowReportModal(false)}
                        onSuccess={() => showToast('Denúncia enviada. Obrigado.', 'success')}
                    />
                )}
                {showBlockModal && friendData && jwt && (
                    <BlockModal
                        username={friendData.user.username}
                        userId={friendData.user.id}
                        jwt={jwt}
                        onClose={() => setShowBlockModal(false)}
                        onSuccess={() => {
                            showToast(`@${friendData.user.username} foi bloqueado.`, 'success');
                            setTimeout(() => router.replace('/friends'), 1500);
                        }}
                    />
                )}
                {showStatsModal && friendData && (
                    <StatsModal
                        friendData={friendData}
                        myXP={myXP}
                        myLevel={myLevel}
                        language={language}
                        onClose={() => setShowStatsModal(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default function FriendProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--zenith-active)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <FriendProfileContent />
        </Suspense>
    );
}
