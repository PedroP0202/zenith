"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Bell, ChevronLeft, User as UserIcon, Cloud, Globe, Lock, Eye, EyeOff, Mail, Trophy, ChevronDown, ChevronUp, Flame, Target, Calendar, Users } from "lucide-react";
import { scheduleAllNotifications, cancelAllNotifications, requestNotificationPermissions, sendTestNotification } from "@/utils/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import ConfirmationModal from "@/components/ConfirmationModal";
import { deviceHaptics } from "@/utils/haptics";
import TrophyWall from "@/components/TrophyWall";
import { getBestStreak, getYearlyStats } from "@/utils/streak";
import { getRankForLevel, getLevelProgress, getXPNeededForLevel, getXpToNextLevel } from "@/utils/progression";

export default function ProfilePage() {
    const router = useRouter();
    const { t, language } = useTranslation();
    const {
        habits,
        logs,
        userName,
        setUserName,
        isMorningReminderActive,
        setMorningReminder,
        morningReminderTime,
        setMorningReminderTime,
        setLanguage,
        jwt,
        logout,
        syncStatus,
        lastSyncedAt,
        syncWithCloud,
        optInLeaderboard,
        setOptInLeaderboard,
        username,
        setUsername,
        totalXP,
        level,
        friends
    } = useStore();
    const [mounted, setMounted] = useState(false);

    const [nameInput, setNameInput] = useState("");
    const [usernameInput, setUsernameInput] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isSavingUsername, setIsSavingUsername] = useState(false);
    const [usernameMessage, setUsernameMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [rewards, setRewards] = useState<any[]>([]);
    const [isLoadingRewards, setIsLoadingRewards] = useState(false);

    useEffect(() => {
        setMounted(true);
        setNameInput(userName);
        setUsernameInput(username || "");
    }, [userName, username]);

    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        if (!usernameInput.trim() || usernameInput.toLowerCase() === username?.toLowerCase()) {
            setIsUsernameAvailable(null);
            setIsCheckingUsername(false);
            return;
        }

        if (usernameInput.length < 3) {
            setIsUsernameAvailable(false);
            setIsCheckingUsername(false);
            return;
        }

        const debounceTimer = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                const res = await fetch(`${API_URL}/auth/check-username?q=${usernameInput}`);
                const data = await res.json();
                setIsUsernameAvailable(data.available);
            } catch (error) {
                console.error("Error checking username:", error);
                setIsUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

    }, [usernameInput, username]);

    useEffect(() => {
        if (jwt) {
            fetchRewards();
        }
    }, [jwt]);

    const fetchRewards = async () => {
        setIsLoadingRewards(true);
        try {
            const res = await fetch(`${API_URL}/users/me/rewards`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRewards(data);
            }
        } catch (error) {
            console.error("Error fetching rewards:", error);
        } finally {
            setIsLoadingRewards(false);
        }
    };

    if (!mounted) return null;

    // Compute stats
    const activeHabits = habits.filter(h => h.isActive);
    const totalCompletions = logs.length;
    const bestStreakAllHabits = activeHabits.reduce((max, h) =>
        Math.max(max, getBestStreak(logs.filter(l => l.habitId === h.id), h.frequency)), 0);
    const yearlyStats = getYearlyStats(logs, new Date());

    // New Space-Themed Progression
    const currentRank = getRankForLevel(level);
    const levelProgress = getLevelProgress(totalXP, level);
    const xpInLevel = totalXP - getXPNeededForLevel(level);
    const xpRequiredForNext = getXpToNextLevel(level);

    const handleReminderToggle = async () => {
        const newValue = !isMorningReminderActive;
        setMorningReminder(newValue);

        if (newValue) {
            const hasPermissions = await requestNotificationPermissions();
            if (hasPermissions) {
                await scheduleAllNotifications(habits, true, morningReminderTime);
            } else {
                setMorningReminder(false);
            }
        } else {
            await cancelAllNotifications();
        }
    };

    const handleSaveName = () => {
        if (nameInput.trim()) {
            setUserName(nameInput.trim());
        }
    };


    const handleSaveUsername = async () => {
        const clean = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!clean || clean.length < 3) return;
        
        if (isUsernameAvailable || clean === username?.toLowerCase()) {
            if (clean === username) {
                setUsernameMessage({ text: "Esta já é a tua tag.", type: 'info' });
                return;
            }

            setIsSavingUsername(true);
            try {
                await setUsername(clean);
                deviceHaptics.success();
                setUsernameMessage({ text: "Tag atualizada com sucesso!", type: 'success' });
                setTimeout(() => setUsernameMessage(null), 3000);
            } catch (error) {
                deviceHaptics.error();
                setUsernameMessage({ text: "Erro ao atualizar tag.", type: 'error' });
            } finally {
                setIsSavingUsername(false);
            }
        }
    };

    const handleExportData = () => {
        const data = { habits, logs };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zenith-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteAccount = async () => {
        if (!jwt) {
            logout();
            router.push('/login');
            return;
        }

        if (!deletePassword) return;
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/auth/account`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({ password: deletePassword })
            });

            if (res.ok) {
                logout();
                router.push('/login');
            } else {
                const data = await res.json();
                alert(data.error || t.common.error);
            }
        } catch (error) {
            alert(t.common.error);
        } finally {
            setIsDeleting(false);
            setDeletePassword("");
        }
    };

    const handleChangePassword = async () => {
        if (!jwt) return;
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordError(t.common.error);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordError(t.auth.passwordsMismatch);
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError(t.settings.security.passwordShort);
            return;
        }

        setIsChangingPassword(true);
        setPasswordError("");

        try {
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                deviceHaptics.success();
                setShowPasswordConfirm(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
            } else {
                deviceHaptics.error();
                setPasswordError(data.error || t.common.error);
            }
        } catch (error) {
            deviceHaptics.error();
            setPasswordError(t.common.error);
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 font-sans flex flex-col items-center">
            {/* Header */}
            <motion.div
                className="w-full max-w-md flex items-center mb-8 pt-4"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
            >
                <button
                    onClick={() => router.push('/')}
                    className="p-2 -ml-2 text-white/50 hover:text-white transition-colors active:scale-90"
                    aria-label="Back to Home"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="flex-1 text-center pr-8">
                    <h1 className="text-xl font-medium tracking-tight text-white/90">
                        Perfil
                    </h1>
                </div>
            </motion.div>

            <div className="w-full max-w-md space-y-10 pb-32">
                {/* Profile Identity Section */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05, type: 'spring', bounce: 0.15 }}
                    className="flex flex-col items-center"
                >
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-white/20 to-white/5 border border-white/10 shadow-2xl flex items-center justify-center mb-3 rotate-3">
                        <UserIcon className="w-10 h-10 text-white/80 -rotate-3" />
                    </div>

                    {/* Level & Rank Header */}
                    <div className="flex flex-col items-center mb-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative flex items-center justify-center mb-2"
                        >
                            <div className="absolute inset-0 bg-[var(--zenith-active)]/20 blur-2xl rounded-full" />
                            <span className="text-4xl font-black italic tracking-tighter text-white z-10">
                                <span className="text-white/40 not-italic mr-1 text-xl font-medium uppercase tracking-widest">Zen</span>
                                {level}
                            </span>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--zenith-active)] shadow-[0_0_8px_var(--zenith-active)]" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">{currentRank.name}</span>
                        </motion.div>
                    </div>

                    {/* Progres Bar Section */}
                    <div className="w-full bg-white/[0.03] rounded-3xl p-6 border border-white/5 backdrop-blur-md mb-6">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Experiência</div>
                                <div className="text-lg font-mono font-bold text-white/90 tabular-nums">
                                    {xpInLevel} <span className="text-white/20">/ {xpRequiredForNext} ZP</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Próximo Nível</div>
                                <div className="text-xs font-bold text-[var(--zenith-active)]">{Math.round(levelProgress * 100)}%</div>
                            </div>
                        </div>
                        
                        {/* The Actual Progress Bar */}
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[2px]">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${levelProgress * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-[var(--zenith-active)]/40 to-[var(--zenith-active)] rounded-full relative"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </motion.div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest">
                            <span>{currentRank.description}</span>
                            <span className="text-white/40">{totalXP} ZP Total</span>
                        </div>
                    </div>

                    <div className="w-full bg-white/[0.03] rounded-3xl p-4 flex flex-col gap-4 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-xs uppercase tracking-widest text-white/30 font-bold w-12 text-right">NOME</span>
                            <div className="flex-1 pl-2 border-l border-white/10">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    onBlur={handleSaveName}
                                    placeholder={t.settings.namePlaceholder}
                                    className="w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-white/20"
                                    maxLength={24}
                                />
                            </div>
                        </div>
                        <div className="h-px bg-white/5 mx-2" />
                        <div className="flex items-center gap-3">
                            <span className="text-xs uppercase tracking-widest text-[var(--zenith-active)] font-bold w-12 text-right">TAG</span>
                            <div className="flex-1 pl-2 border-l border-white/10 flex flex-col gap-1">
                                <div className="flex items-center text-white/40 font-mono text-base">
                                    <span className="mr-0.5">@</span>
                                    <input
                                        type="text"
                                        value={usernameInput}
                                        onChange={(e) => {
                                            setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                            setUsernameMessage(null);
                                        }}
                                        placeholder="username"
                                        className="w-full bg-transparent text-white/80 outline-none placeholder:text-white/20"
                                        maxLength={20}
                                    />
                                    {usernameInput.trim().toLowerCase() !== username?.toLowerCase() && usernameInput.length >= 3 && isUsernameAvailable && (
                                        <motion.button
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={handleSaveUsername}
                                            disabled={isSavingUsername || isCheckingUsername}
                                            className="px-3 py-1 bg-[var(--zenith-active)] text-black text-[10px] font-black uppercase tracking-tighter rounded-full ml-2 active:scale-90 transition-all disabled:opacity-50"
                                        >
                                            {isSavingUsername ? '...' : 'Confirmar'}
                                        </motion.button>
                                    )}
                                </div>
                                {(isCheckingUsername || isUsernameAvailable !== null || usernameMessage) && (
                                    <div className="flex items-center gap-1.5 ml-4 mt-1">
                                        {isCheckingUsername ? (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                                                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">A verificar...</span>
                                            </>
                                        ) : usernameMessage ? (
                                            <>
                                                <div className={`w-1.5 h-1.5 rounded-full ${usernameMessage.type === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : usernameMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-400'}`} />
                                                <span className={`text-[10px] uppercase tracking-widest font-bold ${usernameMessage.type === 'success' ? 'text-green-500/70' : usernameMessage.type === 'error' ? 'text-red-500/70' : 'text-blue-400/70'}`}>
                                                    {usernameMessage.text}
                                                </span>
                                            </>
                                        ) : isUsernameAvailable ? (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                                <span className="text-[10px] text-green-500/70 uppercase tracking-widest font-bold">Tag disponível</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold">
                                                    {usernameInput.length < 3 ? 'Mínimo 3 caracteres' : 'Tag indisponível'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Quick Stats */}
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08, type: 'spring' }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                    {[
                        {
                            icon: Flame,
                            label: 'Melhor Streak',
                            value: `${bestStreakAllHabits}d`,
                            color: bestStreakAllHabits >= 30 ? '#FFD700' : bestStreakAllHabits >= 7 ? '#00C853' : 'rgba(255,255,255,0.8)',
                        },
                        {
                            icon: Calendar,
                            label: 'Dias Ativos',
                            value: yearlyStats.activeDays,
                            color: 'rgba(255,255,255,0.8)',
                        },
                        {
                            icon: Target,
                            label: 'Check-ins',
                            value: totalCompletions,
                            color: 'rgba(255,255,255,0.8)',
                        },
                        {
                            icon: Users,
                            label: 'Amigos',
                            value: friends?.length || 0,
                            color: 'rgba(255,255,255,0.8)',
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.08 + i * 0.06, type: 'spring' }}
                            className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-2"
                        >
                            <stat.icon size={16} className="text-white/30" strokeWidth={1.5} />
                            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-tight">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.section>

                {/* Trophy Wall */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, type: 'spring', bounce: 0.15 }}
                >
                    <TrophyWall />
                </motion.section>

                {/* Arena History - Condecorações */}
                {rewards.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 font-black">Histórico da Arena</h2>
                            <span className="text-[10px] text-[var(--zenith-active)] font-bold">{rewards.length} {rewards.length === 1 ? 'Condecoração' : 'Condecorações'}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {rewards.map((reward) => (
                                <div 
                                    key={reward.id}
                                    className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col items-center text-center gap-2 backdrop-blur-sm"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center mb-1 shadow-inner">
                                        <Trophy size={20} className={reward.position <= 3 ? "text-yellow-400" : "text-white/40"} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest text-white">{reward.rank_name}</span>
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter mt-0.5">Época {reward.season_id}</span>
                                    </div>
                                    {reward.position && (
                                        <div className="px-2 py-0.5 rounded-full bg-[var(--zenith-active)]/10 border border-[var(--zenith-active)]/20 text-[9px] font-black text-[var(--zenith-active)]">
                                            #{reward.position} GLOBAL
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}

                <div className="h-px w-full bg-white/5" />

                {/* Advanced Settings Toggle */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-[24px] active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/5 rounded-full">
                            <SettingsIcon className="w-5 h-5 text-white/70" />
                        </div>
                        <span className="font-bold tracking-tight text-white/90">Configurações Avançadas</span>
                    </div>
                    {showSettings ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
                </motion.button>

                {/* Collapsible Settings Content */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden space-y-8 pt-4"
                        >
                            {/* Language Section */}
                            <section>
                                <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 ml-2 font-bold">{t.settings.language}</h2>
                                <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-white/40">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-base font-medium">Zenith UI</h3>
                                    </div>
                                    <div className="flex bg-white/10 rounded-lg p-1 gap-1">
                                        <button
                                            onClick={() => setLanguage('pt')}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 ${language === 'pt' ? 'bg-white text-black shadow-[0_0_8px_rgba(255,255,255,0.15)]' : 'text-white/50 hover:text-white'}`}
                                        >
                                            PT
                                        </button>
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 ${language === 'en' ? 'bg-white text-black shadow-[0_0_8px_rgba(255,255,255,0.15)]' : 'text-white/50 hover:text-white'}`}
                                        >
                                            EN
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Cloud Section */}
                            <section>
                                <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 ml-2 font-bold">Zenith Cloud</h2>
                                <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 flex-shrink-0 transition-colors ${jwt ? (syncStatus === 'error' ? 'text-red-400' : 'text-[#00C853]') : 'text-white/40'}`}>
                                                <Cloud className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-medium">{jwt ? t.settings.cloudSyncActive : t.settings.cloudSync}</h3>
                                                <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-[200px]">
                                                    {jwt
                                                        ? (syncStatus === 'syncing' ? t.common.loading : `${t.settings.lastSync}: ${lastSyncedAt > 0 ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t.settings.pending}`)
                                                        : t.settings.protect}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {jwt ? (
                                                <button
                                                    onClick={() => logout()}
                                                    className="text-[11px] font-bold text-red-400 bg-red-400/10 px-4 py-2 rounded-xl transition-colors active:scale-95 uppercase tracking-wider"
                                                >
                                                    {t.settings.logout}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => router.push('/login')}
                                                    className="text-[11px] font-bold text-black bg-white px-4 py-2 rounded-xl transition-colors active:scale-95 uppercase tracking-wider"
                                                >
                                                    {t.auth.submitLogin}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {jwt && (
                                        <div className="pt-2 border-t border-white/[0.03] flex items-center justify-between">
                                            <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{t.settings.vaultStatus}</span>
                                            <button
                                                onClick={() => syncWithCloud()}
                                                disabled={syncStatus === 'syncing'}
                                                className="flex items-center gap-2 text-xs font-medium text-[var(--zenith-active)] hover:opacity-80 transition-opacity disabled:opacity-30"
                                            >
                                                {syncStatus === 'syncing' ? t.common.loading : t.settings.forceSync}
                                                {syncStatus === 'error' && <span className="text-red-400 ml-1">(! Error)</span>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Security Section */}
                            {jwt && (
                                <section>
                                    <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 ml-2 font-bold">{(t.settings as any).security.title}</h2>
                                    <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-white/40">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-medium">{(t.settings as any).security.changePassword}</h3>
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">Sincronizado</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowPasswordConfirm(true)}
                                            className="text-[11px] font-bold text-white bg-white/10 px-4 py-2 rounded-xl transition-colors hover:bg-white/20 active:scale-95 uppercase tracking-wider"
                                        >
                                            {t.common.edit}
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Notifications Section */}
                            <section>
                                <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 ml-2 font-bold">{t.settings.notifications.title}</h2>

                                <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 flex-shrink-0 transition-colors ${isMorningReminderActive ? 'text-[var(--zenith-active)]' : 'text-white/40'}`}>
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-medium">{t.settings.notifications.morningReminder}</h3>
                                            <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-[200px]">
                                                {t.settings.notifications.morningReminderDesc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-col sm:flex-row">
                                        {isMorningReminderActive && (
                                            <input
                                                type="time"
                                                value={morningReminderTime || '09:00'}
                                                onChange={async (e) => {
                                                    const newTime = e.target.value;
                                                    setMorningReminderTime(newTime);
                                                    await scheduleAllNotifications(habits, true, newTime);
                                                }}
                                                className="bg-transparent text-sm font-medium text-white/90 outline-none border border-white/10 rounded-lg px-2 py-1.5 focus:border-[var(--zenith-active)] transition-colors"
                                            />
                                        )}
                                        <button
                                            onClick={handleReminderToggle}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 ${isMorningReminderActive ? 'bg-[var(--zenith-active)]' : 'bg-white/20'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                                initial={false}
                                                animate={{ x: isMorningReminderActive ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={async () => await sendTestNotification()}
                                        className="text-[11px] font-medium text-white/30 tracking-widest uppercase hover:text-white/70 transition-colors border border-white/5 rounded-full px-4 py-2 bg-white/5 active:scale-95"
                                    >
                                        {t.settings.notifications.test}
                                    </button>
                                </div>
                            </section>

                            {/* Arena Switch Section */}
                            {optInLeaderboard && (
                                <section>
                                    <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 ml-2 font-bold">A Arena</h2>
                                    <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-white/40">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-medium">Arena Global</h3>
                                                <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-[200px]">O teu nome e pontuação estão visíveis para outros.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (confirm("Atenção: A Arena é muito competitiva. Sair agora irá APAGAR todos os teus pontos atuais ganho nesta Temporada. Tens a certeza?")) {
                                                    setOptInLeaderboard(false);
                                                }
                                            }}
                                            className="text-[11px] font-bold text-red-400 bg-red-400/10 px-4 py-2 rounded-xl transition-colors hover:bg-red-400/20 active:scale-95 uppercase tracking-wider"
                                        >
                                            Sair
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Danger Zone */}
                            <section>
                                <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 ml-2 font-bold">{t.settings.dangerZone.title}</h2>
                                <div className="bg-white/[0.03] rounded-3xl p-5 border border-red-500/20 flex flex-col gap-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-base font-medium">{t.settings.dangerZone.exportData}</h3>
                                            <p className="text-xs text-white/50 mt-1 max-w-[200px] leading-relaxed">{t.settings.dangerZone.exportDesc}</p>
                                        </div>
                                        <button onClick={handleExportData} className="text-[11px] font-bold text-white bg-white/10 px-4 py-2 rounded-xl transition-colors hover:bg-white/20 active:scale-95 uppercase tracking-wider">
                                            {t.settings.export}
                                        </button>
                                    </div>
                                    <div className="pt-4 border-t border-white/[0.03] flex items-start justify-between">
                                        <div>
                                            <h3 className="text-base font-medium text-red-400">{t.settings.dangerZone.deleteAccount}</h3>
                                            <p className="text-xs text-white/50 mt-1 max-w-[200px] leading-relaxed">{t.settings.dangerZone.deleteWarning}</p>
                                        </div>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="text-[11px] font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-xl transition-colors hover:bg-red-500/20 active:scale-95 uppercase tracking-wider">
                                            {t.common.delete}
                                        </button>
                                    </div>
                                </div>
                            </section>
                            
                            <div className="flex justify-center pb-8 pt-4">
                                <a
                                    href="mailto:zenithstartuo@gmail.com"
                                    onClick={() => deviceHaptics.lightImpact()}
                                    className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] hover:text-white/70 transition-colors"
                                >
                                    {(t.settings as any).support.contactUs}
                                </a>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals remain mostly identical handling delete and password changes... */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}
                onConfirm={handleDeleteAccount}
                title={t.settings.dangerZone.deleteAccount}
                description={t.settings.dangerZone.deleteWarning}
                confirmLabel={t.settings.dangerZone.deleteAction}
                cancelLabel={t.common.cancel}
            >
                {jwt && (
                    <div className="mt-6 w-full text-left">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 block ml-1">
                            {t.settings.dangerZone.passwordConfirm}
                        </label>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-red-500/50 transition-colors"
                            autoFocus
                        />
                    </div>
                )}
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={showPasswordConfirm}
                onClose={() => {
                    setShowPasswordConfirm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setPasswordError("");
                }}
                onConfirm={handleChangePassword}
                title={(t.settings as any).security.changePassword}
                description="Altera a tua chave de acesso à Zenith Cloud."
                confirmLabel={isChangingPassword ? "A Processar..." : (t.settings as any).security.changeAction}
                cancelLabel={t.common.cancel}
                isDanger={false}
            >
                <div className="mt-6 w-full text-left space-y-4">
                     <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block ml-1">
                            {(t.settings as any).security.currentPassword}
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 pr-12 text-white outline-none focus:border-[var(--zenith-active)]/50 transition-colors"
                            />
                            <button onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block ml-1">
                            {(t.settings as any).security.newPassword}
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-[var(--zenith-active)]/50 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block ml-1">
                            {(t.settings as any).security.confirmNewPassword}
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className={`w-full h-14 bg-white/5 border rounded-2xl px-4 text-white outline-none transition-colors ${confirmNewPassword && newPassword === confirmNewPassword ? 'border-green-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    {passwordError && (
                        <p className="text-xs font-bold text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-center">
                            {passwordError}
                        </p>
                    )}
                </div>
            </ConfirmationModal>
        </main>
    );
}
