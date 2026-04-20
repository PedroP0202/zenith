'use client';

import { useStore } from '../../store/useStore';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    Trophy,
    Crown,
    Loader2,
    Play,
    ShieldCheck,
    Calendar,
    Clock3,
    BarChart3,
    Users,
    Search,
    RefreshCw,
    Medal,
    ShieldAlert,
    Star,
    Sparkles,
    Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';

interface LeaderboardEntry {
    id: string;
    name: string;
    username: string;
    score?: number;
    position?: number;
    rank_name?: string;
    season_name?: string;
    season_id?: string;
    season_start_at?: number;
    season_end_at?: number;
    created_at?: number;
}

interface ArenaSeason {
    id: string;
    name: string;
    startsAt: number;
    endsAt: number;
}

interface ArenaMeta {
    participantsCount?: number;
    averageScore?: number;
    topScore?: number;
    seasonsCount?: number;
    totalWinners?: number;
}

interface ArenaMeSummary {
    userId: string;
    name: string;
    username: string;
    score: number;
    position: number;
    percentile: number;
    pointsToNext: number;
    tier: string;
    isInTop: boolean;
}

interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    type: 'seasonal' | 'historical';
    season?: ArenaSeason | null;
    meta?: ArenaMeta;
    me?: ArenaMeSummary | null;
}

type LeaderboardPeriod = 'seasonal' | 'historical';

type LeaderboardPeriodTab = {
    id: LeaderboardPeriod;
    label: string;
    icon: LucideIcon;
};

const TIERS = [
    { name: 'Zenith', min: 2500, color: 'text-white', pill: 'bg-white/15 border-white/25', icon: Star },
    { name: 'Avatar', min: 1500, color: 'text-fuchsia-300', pill: 'bg-fuchsia-500/15 border-fuchsia-500/30', icon: Crown },
    { name: 'Soberano', min: 900, color: 'text-indigo-300', pill: 'bg-indigo-500/15 border-indigo-500/30', icon: ShieldCheck },
    { name: 'Astre', min: 550, color: 'text-blue-300', pill: 'bg-blue-500/15 border-blue-500/30', icon: Sparkles },
    { name: 'Pulsar', min: 350, color: 'text-cyan-300', pill: 'bg-cyan-500/15 border-cyan-500/30', icon: Target },
    { name: 'Nova', min: 200, color: 'text-orange-300', pill: 'bg-orange-500/15 border-orange-500/30', icon: Trophy },
    { name: 'Núcleo', min: 120, color: 'text-emerald-300', pill: 'bg-emerald-500/15 border-emerald-500/30', icon: Medal },
    { name: 'Órbita', min: 70, color: 'text-zinc-300', pill: 'bg-white/10 border-white/20', icon: Trophy },
    { name: 'Vetor', min: 40, color: 'text-zinc-400', pill: 'bg-white/7 border-white/15', icon: Trophy },
    { name: 'Flux', min: 20, color: 'text-zinc-500', pill: 'bg-white/6 border-white/12', icon: Trophy },
    { name: 'Vácuo', min: 5, color: 'text-zinc-500', pill: 'bg-white/5 border-white/10', icon: Trophy },
    { name: 'Spark', min: 0, color: 'text-zinc-500', pill: 'bg-white/5 border-white/10', icon: Trophy },
];

const getTier = (score: number) => TIERS.find((tier) => score >= tier.min) || TIERS[TIERS.length - 1];

function formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString('en-US') : '0';
}

export default function LeaderboardPage() {
    const { optInLeaderboard, setOptInLeaderboard, jwt, username: myUsername } = useStore();
    const { t } = useTranslation();
    const router = useRouter();

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConsent, setShowConsent] = useState(false);
    const [showOptOutConfirm, setShowOptOutConfirm] = useState(false);
    const [period, setPeriod] = useState<LeaderboardPeriod>('seasonal');
    const [season, setSeason] = useState<ArenaSeason | null>(null);
    const [meta, setMeta] = useState<ArenaMeta>({});
    const [me, setMe] = useState<ArenaMeSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const periodTabs: LeaderboardPeriodTab[] = [
        { id: 'seasonal', label: t.arena.tabsSeasonal, icon: Calendar },
        { id: 'historical', label: t.arena.tabsHistorical, icon: Trophy },
    ];

    const fetchLeaderboard = useCallback(async () => {
        if (!jwt || !optInLeaderboard) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/leaderboard?period=${period}`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const data = (await res.json().catch(() => ({}))) as Partial<LeaderboardResponse> & { error?: string };
            if (!res.ok) throw new Error(data.error || `(${res.status}) Failed to load arena.`);

            setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
            setSeason(data.season || null);
            setMeta(data.meta || {});
            setMe(data.me || null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t.common.error);
            setLeaderboard([]);
            setMeta({});
            setSeason(null);
            setMe(null);
        } finally {
            setLoading(false);
        }
    }, [jwt, optInLeaderboard, period, t.common.error]);

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
        setShowOptOutConfirm(false);
        setShowConsent(false);
        setSearchQuery('');
        setLeaderboard([]);
        setMe(null);
    };

    const rankById = useMemo(() => {
        const map = new Map<string, number>();
        leaderboard.forEach((entry, index) => {
            map.set(entry.id, index + 1);
        });
        return map;
    }, [leaderboard]);

    const filteredLeaderboard = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return leaderboard;
        return leaderboard.filter((entry) => {
            const name = entry.name?.toLowerCase() || '';
            const handle = entry.username?.toLowerCase() || '';
            return name.includes(query) || handle.includes(query);
        });
    }, [leaderboard, searchQuery]);

    const historicalBySeason = useMemo(() => {
        const grouped = new Map<string, LeaderboardEntry[]>();

        filteredLeaderboard.forEach((entry) => {
            const seasonName = entry.season_name || entry.season_id || 'Season';
            if (!grouped.has(seasonName)) {
                grouped.set(seasonName, []);
            }
            grouped.get(seasonName)?.push(entry);
        });

        return Array.from(grouped.entries());
    }, [filteredLeaderboard]);

    const seasonProgress = useMemo(() => {
        if (!season || !season.startsAt || !season.endsAt || season.endsAt <= season.startsAt) return 0;
        const raw = ((Date.now() - season.startsAt) / (season.endsAt - season.startsAt)) * 100;
        return Math.min(100, Math.max(0, Math.round(raw)));
    }, [season]);

    const seasonCountdown = useMemo(() => {
        if (!season) return '';
        const diff = season.endsAt - Date.now();
        if (diff <= 0) return t.arena.lastDay;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 1) return t.arena.oneDayLeft;
        return `${days} ${t.arena.daysLeft}`;
    }, [season, t.arena.daysLeft, t.arena.lastDay, t.arena.oneDayLeft]);

    const meTier = useMemo(() => {
        if (!me) return null;
        return getTier(me.score);
    }, [me]);

    const seasonEmptyStateLabel = period === 'seasonal' ? t.arena.emptySeason : t.arena.emptyHistory;

    return (
        <main className="flex min-h-[100dvh] flex-col items-center bg-black px-5 pb-24 pt-6 text-white sm:px-6">
            <div className="flex h-full min-h-[85vh] w-full max-w-md flex-col pt-6">
                <header className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10 active:scale-90"
                        aria-label="Back"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div className="text-center">
                        <h1 className="text-xl font-black tracking-tight">{t.arena.title}</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{t.arena.subtitle}</p>
                    </div>
                    <button
                        onClick={() => (optInLeaderboard ? setShowOptOutConfirm(true) : setShowConsent(true))}
                        className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                            optInLeaderboard
                                ? 'border border-red-500/30 bg-red-500/10 text-red-200'
                                : 'border border-white/15 bg-white/5 text-white/70'
                        }`}
                    >
                        {optInLeaderboard ? t.arena.optOutConfirm : t.arena.joinCta}
                    </button>
                </header>

                {optInLeaderboard && (
                    <div className="mb-6 space-y-3">
                        <div className="flex w-full gap-1 rounded-2xl bg-white/5 p-1">
                            {periodTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setPeriod(tab.id)}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                                        period === tab.id ? 'bg-white text-black shadow-lg' : 'text-white/45 hover:text-white/65'
                                    }`}
                                >
                                    <tab.icon size={12} strokeWidth={2.5} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder={t.arena.searchPlaceholder}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-white/25"
                                />
                            </div>
                            <button
                                onClick={fetchLeaderboard}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                                aria-label={t.arena.refresh}
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!optInLeaderboard && !showConsent && (
                        <motion.div
                            key="arena-gate"
                            className="flex flex-1 flex-col items-center justify-center px-4 text-center"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.04 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="mb-6 rounded-3xl border border-white/12 bg-white/[0.03] p-5">
                                <Trophy size={44} className="mx-auto text-[var(--zenith-active)]" strokeWidth={1.2} />
                            </div>
                            <h2 className="mb-4 text-3xl font-medium tracking-tight">{t.arena.enterTitle}</h2>
                            <p className="mb-10 max-w-[290px] text-sm leading-relaxed text-white/45">{t.arena.enterDescription}</p>
                            <button
                                onClick={() => setShowConsent(true)}
                                className="flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition-transform hover:-translate-y-0.5 active:scale-95"
                            >
                                <Play size={16} fill="currentColor" />
                                {t.arena.joinCta}
                            </button>
                        </motion.div>
                    )}

                    {!optInLeaderboard && showConsent && (
                        <motion.div
                            key="arena-consent"
                            className="flex flex-1 flex-col justify-center px-2"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-8 flex items-center gap-3">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                    <ShieldCheck size={22} className="text-white/70" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{t.arena.consentTitle}</h2>
                                    <p className="text-sm text-white/45">{t.arena.consentDescription}</p>
                                </div>
                            </div>

                            <div className="mb-8 space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                                {[t.arena.consentBullet1, t.arena.consentBullet2, t.arena.consentBullet3, t.arena.consentBullet4].map((item, index) => (
                                    <div key={index} className="flex items-start gap-3 text-sm text-white/65">
                                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--zenith-active)]" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleOptIn}
                                    className="rounded-2xl bg-white py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition-transform active:scale-95"
                                >
                                    {t.arena.consentConfirm}
                                </button>
                                <button
                                    onClick={() => setShowConsent(false)}
                                    className="rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-sm font-bold text-white/55 transition-colors hover:text-white/75"
                                >
                                    {t.arena.cancel}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {optInLeaderboard && (
                        <motion.div
                            key="arena-content"
                            className="flex flex-1 flex-col"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                        >
                            {loading ? (
                                <div className="flex flex-1 items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-white/25" />
                                </div>
                            ) : error ? (
                                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                                    <p className="max-w-[280px] text-sm text-red-200">{error}</p>
                                    <button
                                        onClick={fetchLeaderboard}
                                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/70"
                                    >
                                        {t.arena.retry}
                                    </button>
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-white/45">
                                    <Users size={30} />
                                    <p className="max-w-[260px] text-sm">{seasonEmptyStateLabel}</p>
                                </div>
                            ) : (
                                <div className="space-y-5 pb-20">
                                    {period === 'seasonal' && (
                                        <>
                                            <section className="rounded-[2rem] border border-white/12 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5">
                                                <div className="mb-4 flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{t.arena.myPerformance}</p>
                                                        {me ? (
                                                            <h2 className="mt-1 text-2xl font-black leading-tight">
                                                                #{me.position} · {formatNumber(me.score)}
                                                            </h2>
                                                        ) : (
                                                            <h2 className="mt-1 text-xl font-black leading-tight text-white/70">{t.arena.notParticipating}</h2>
                                                        )}
                                                    </div>
                                                    {meTier && (
                                                        <div className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${meTier.pill} ${meTier.color}`}>
                                                            {me?.tier || meTier.name}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">{t.arena.participants}</p>
                                                        <p className="mt-2 text-2xl font-black">{formatNumber(meta.participantsCount || 0)}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">{t.arena.topScore}</p>
                                                        <p className="mt-2 text-2xl font-black">{formatNumber(meta.topScore || 0)}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">{t.arena.averageScore}</p>
                                                        <p className="mt-2 text-2xl font-black">{formatNumber(meta.averageScore || 0)}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">{t.arena.myPercentile}</p>
                                                        <p className="mt-2 text-2xl font-black text-[var(--zenith-active)]">{me ? `${me.percentile}%` : '--'}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-white/60">
                                                    {me ? (
                                                        me.pointsToNext > 0
                                                            ? `${t.arena.pointsToNext}: ${formatNumber(me.pointsToNext)}`
                                                            : t.arena.noNextTarget
                                                    ) : (
                                                        t.arena.notParticipating
                                                    )}
                                                </div>
                                            </section>

                                            {season && (
                                                <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{season.name}</p>
                                                            <p className="text-xs text-white/50">{t.arena.seasonEnds}</p>
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/70">
                                                            <Clock3 size={12} />
                                                            {seasonCountdown}
                                                        </div>
                                                    </div>
                                                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                                                        <div
                                                            className="h-full rounded-full bg-[var(--zenith-active)] transition-[width] duration-500"
                                                            style={{ width: `${seasonProgress}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[11px] font-medium text-white/45">
                                                        {t.arena.seasonProgress}: {seasonProgress}%
                                                    </p>
                                                </section>
                                            )}
                                        </>
                                    )}

                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{period === 'seasonal' ? t.arena.rankingTitle : t.arena.championsWall}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">{filteredLeaderboard.length}</p>
                                        </div>

                                        {filteredLeaderboard.length === 0 && searchQuery ? (
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center text-xs text-white/50">
                                                {t.arena.searchEmpty}
                                            </div>
                                        ) : period === 'seasonal' ? (
                                            filteredLeaderboard.map((entry, index) => {
                                                const score = Number(entry.score || 0);
                                                const tier = getTier(score);
                                                const rank = rankById.get(entry.id) || index + 1;
                                                const isMe = !!(me?.userId && me.userId === entry.id) || (!!myUsername && myUsername === entry.username);
                                                const TierIcon = tier.icon;

                                                let rankBadge: React.ReactNode = <span className="font-mono text-base text-white/35">#{rank}</span>;
                                                if (rank === 1) rankBadge = <Crown size={18} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]" />;
                                                if (rank === 2) rankBadge = <Medal size={18} className="text-zinc-300" />;
                                                if (rank === 3) rankBadge = <Star size={18} className="text-orange-300" />;

                                                return (
                                                    <motion.div
                                                        key={entry.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: Math.min(index * 0.025, 0.35) }}
                                                        className={`rounded-[1.7rem] border p-4 ${
                                                            isMe
                                                                ? 'border-[var(--zenith-active)]/45 bg-[var(--zenith-active)]/10'
                                                                : 'border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                                                                    {rankBadge}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-black">{entry.name}</p>
                                                                    <p className="truncate text-[10px] font-mono text-white/40">@{entry.username || 'user'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black">
                                                                        {formatNumber(score)} <span className="text-[10px] text-white/35">pts</span>
                                                                    </p>
                                                                    <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${tier.color}`}>{tier.name}</p>
                                                                </div>
                                                                <div className={`rounded-xl border p-2 ${tier.pill}`}>
                                                                    <TierIcon size={13} className={tier.color} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        ) : (
                                            <div className="space-y-7">
                                                {historicalBySeason.map(([seasonName, winners]) => (
                                                    <div key={seasonName} className="space-y-3">
                                                        <div className="flex items-center gap-3 px-1">
                                                            <div className="h-px flex-1 bg-white/10" />
                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{seasonName}</h4>
                                                            <div className="h-px flex-1 bg-white/10" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            {winners.map((winner) => {
                                                                const pos = Number(winner.position || 0);
                                                                const isMe = !!(me?.userId && me.userId === winner.id) || (!!myUsername && myUsername === winner.username);

                                                                return (
                                                                    <div
                                                                        key={`${winner.id}-${winner.season_id}-${winner.position}`}
                                                                        className={`flex items-center justify-between rounded-2xl border p-4 ${
                                                                            isMe
                                                                                ? 'border-[var(--zenith-active)]/45 bg-[var(--zenith-active)]/10'
                                                                                : 'border-white/10 bg-white/[0.03]'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                                                                                {pos === 1 ? (
                                                                                    <Crown size={16} className="text-yellow-400" />
                                                                                ) : pos === 2 ? (
                                                                                    <Medal size={16} className="text-zinc-300" />
                                                                                ) : (
                                                                                    <Trophy size={16} className="text-orange-300" />
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-black">{winner.name}</p>
                                                                                <p className="text-[10px] font-mono text-white/40">@{winner.username}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
                                                                                {winner.rank_name || `#${pos}`}
                                                                            </p>
                                                                            <p className="text-[10px] text-white/35">
                                                                                {t.arena.rankLabel}: #{pos || '--'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <div className="pt-2 text-center">
                                        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/45">
                                            <BarChart3 size={12} />
                                            {t.arena.visibilityNote}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showOptOutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[140] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm"
                        onClick={() => setShowOptOutConfirm(false)}
                    >
                        <motion.div
                            initial={{ y: 32, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 32, opacity: 0 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                            className="w-full max-w-md rounded-[2rem] border border-red-500/25 bg-zinc-950 p-6"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-2.5">
                                    <ShieldAlert size={18} className="text-red-200" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black">{t.arena.optOutTitle}</h3>
                                    <p className="text-xs text-white/50">{t.arena.optOutDescription}</p>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <button
                                    onClick={handleOptOut}
                                    className="rounded-xl bg-red-500 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-transform active:scale-[0.98]"
                                >
                                    {t.arena.optOutConfirm}
                                </button>
                                <button
                                    onClick={() => setShowOptOutConfirm(false)}
                                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/75"
                                >
                                    {t.arena.optOutCancel}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
