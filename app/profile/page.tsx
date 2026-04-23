"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Cloud,
    Eye,
    EyeOff,
    Flame,
    Globe,
    Loader2,
    Lock,
    Mail,
    Settings as SettingsIcon,
    ShieldOff,
    Target,
    Trophy,
    Users,
    type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import ConfirmationModal from "@/components/ConfirmationModal";
import TrophyWall from "@/components/TrophyWall";
import type { ArenaReward, BlockedUser } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { useStore } from "@/store/useStore";
import { API_URL } from "@/utils/constants";
import { deviceHaptics } from "@/utils/haptics";
import { scheduleAllNotifications, cancelAllNotifications, requestNotificationPermissions, sendTestNotification } from "@/utils/notifications";
import { getRankForLevel, getLevelProgress, getXPNeededForLevel, getXpToNextLevel } from "@/utils/progression";
import { getBestStreak, getYearlyStats } from "@/utils/streak";

const EN_RANK_DESCRIPTIONS: Record<string, string> = {
    Spark: "The first spark of momentum.",
    "Vácuo": "Shaping your own gravity in the void.",
    Flux: "Energy starts to move with intent.",
    Vetor: "Direction and force are clearly defined.",
    "Órbita": "Rhythm becomes stable and repeatable.",
    "Núcleo": "A solid center for your discipline.",
    Nova: "New habits expanding with force.",
    Pulsar: "A constant and unstoppable frequency.",
    Astre: "A brightness that lights your system.",
    Soberano: "Clear command over your time.",
    Avatar: "Aligned with a deeper order.",
    Zenith: "The highest state of disciplined clarity.",
};

type Tone = "neutral" | "positive" | "warning" | "danger";

function getToneClasses(tone: Tone) {
    if (tone === "positive") {
        return {
            icon: "text-[var(--zenith-active)]",
            value: "text-[var(--zenith-active)]",
            surface: "border-[color:rgba(var(--zenith-active-rgb),0.18)] bg-[color:rgba(var(--zenith-active-rgb),0.08)]",
        };
    }

    if (tone === "warning") {
        return {
            icon: "text-amber-300",
            value: "text-amber-300",
            surface: "border-amber-300/15 bg-amber-300/8",
        };
    }

    if (tone === "danger") {
        return {
            icon: "text-red-400",
            value: "text-red-400",
            surface: "border-red-400/15 bg-red-400/8",
        };
    }

    return {
        icon: "text-white/36",
        value: "text-white",
        surface: "border-white/8 bg-white/[0.03]",
    };
}

function SectionHeading({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-4 flex items-end justify-between gap-4">
            <div>
                <p className="app-kicker">{eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{title}</h2>
                {description ? <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-white/45">{description}</p> : null}
            </div>
            {action}
        </div>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    detail,
    tone = "neutral",
    delay = 0,
}: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    detail?: string;
    tone?: Tone;
    delay?: number;
}) {
    const toneClasses = getToneClasses(tone);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, delay, type: "spring" }}
            className={`rounded-[26px] border p-4 ${toneClasses.surface}`}
        >
            <Icon size={16} className={toneClasses.icon} strokeWidth={1.7} />
            <p className={`mt-4 text-2xl font-semibold tracking-[-0.06em] ${toneClasses.value}`}>{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</p>
            {detail ? <p className="mt-3 text-[11px] leading-relaxed text-white/38">{detail}</p> : null}
        </motion.div>
    );
}

function StatusCard({
    icon: Icon,
    label,
    detail,
    tone = "neutral",
}: {
    icon: LucideIcon;
    label: string;
    detail: string;
    tone?: Tone;
}) {
    const toneClasses = getToneClasses(tone);

    return (
        <div className={`rounded-[24px] border p-4 ${toneClasses.surface}`}>
            <div className="flex items-center gap-2">
                <Icon size={15} className={toneClasses.icon} strokeWidth={1.7} />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</span>
            </div>
            <p className={`mt-3 text-sm font-semibold ${toneClasses.value}`}>{detail}</p>
        </div>
    );
}

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
        arenaPoints,
        friends,
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
    const [usernameMessage, setUsernameMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
    const [rewards, setRewards] = useState<ArenaReward[]>([]);
    const [isLoadingRewards, setIsLoadingRewards] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

    const copy =
        language === "pt"
            ? {
                  title: "Perfil",
                  subtitle: "Identidade, progressão e controlo da conta num espaço mais claro e intencional.",
                  heroEyebrow: "Zenith ID",
                  heroTitle: "Centro pessoal",
                  heroDescription: "Tudo o que define a tua presença na Zenith: nome, progressão, cloud, Arena e preferências centrais.",
                  performanceEyebrow: "Snapshot",
                  performanceTitle: "Visão geral",
                  performanceDescription: "Os sinais mais importantes da tua disciplina, sem ruído visual.",
                  arenaEyebrow: "Presença",
                  arenaTitle: "Arena e conquistas",
                  arenaDescription: "Posição competitiva, mural de troféus e histórico de condecorações num só fluxo.",
                  settingsEyebrow: "Control Center",
                  settingsTitle: "Conta e preferências",
                  settingsDescription: "Idioma, cloud, segurança, notificações, Arena e privacidade organizados por prioridade.",
                  openControls: "Abrir",
                  closeControls: "Fechar",
                  localMode: "Modo local",
                  cloudReady: "Cloud pronta",
                  cloudSyncing: "A sincronizar",
                  cloudIssue: "Atenção na cloud",
                  cloudPending: "À espera de sync",
                  remindersOn: "Lembretes ativos",
                  remindersOff: "Lembretes pausados",
                  arenaOn: "Arena ativa",
                  arenaOff: "Arena desligada",
                  activeHabits: "Hábitos ativos",
                  friendsLabel: "Rede",
                  consistencyHint: "Ritmo dos dias ativos neste ano",
                  checkinsHint: "Volume acumulado da tua jornada",
                  habitsHint: "Sistemas em execução agora",
                  friendsHint: "Pessoas ligadas ao teu progresso",
                  streakHint: "Melhor sequência entre hábitos",
                  daysHint: "Dias em que houve atividade",
                  profileHandleHint: "A tua tag aparece no social e na Arena.",
                  profileNameHint: "Usa um nome curto e reconhecível.",
                  connected: "Ligado",
                  guest: "Sem sessão",
                  saveTag: "Guardar",
                  sameTag: "Esta já é a tua tag.",
                  tagSaved: "Tag atualizada com sucesso!",
                  tagError: "Erro ao atualizar tag.",
                  profileFallbackName: "Utilizador Zenith",
                  noUsername: "sem-tag",
                  passwordModalDescription: "Altera a tua chave de acesso à Zenith Cloud.",
                  supportTitle: "Suporte",
                  supportDescription: "Questões, ideias e feedback direto para a equipa.",
                  blockedTitle: "Utilizadores bloqueados",
                  blockedEmpty: "Nenhum utilizador bloqueado.",
                  unblock: "Desbloquear",
                  awardsSingular: "Condecoração",
                  awardsPlural: "Condecorações",
                  seasonAwardsTitle: "Histórico de Arena",
                  seasonAwardsDescription: "Registo das tuas condecorações competitivas ao longo das épocas.",
                  cloudSummaryDescription: "Estado da ligação e sincronização da tua conta.",
                  notificationsSummaryDescription: "Mantém o sistema de lembretes útil sem criar fricção.",
                  arenaSummaryDescription: "Controla a tua participação competitiva e visibilidade.",
                  securitySummaryDescription: "Protege o acesso e mantém a tua conta segura.",
              }
            : {
                  title: "Profile",
                  subtitle: "Identity, progression, and account controls in a cleaner, more intentional space.",
                  heroEyebrow: "Zenith ID",
                  heroTitle: "Personal hub",
                  heroDescription: "Everything that defines your presence in Zenith: name, progression, cloud, Arena, and core preferences.",
                  performanceEyebrow: "Snapshot",
                  performanceTitle: "Overview",
                  performanceDescription: "The most important signals of your discipline, without visual noise.",
                  arenaEyebrow: "Presence",
                  arenaTitle: "Arena and trophies",
                  arenaDescription: "Competitive position, trophy wall, and season rewards in one flow.",
                  settingsEyebrow: "Control Center",
                  settingsTitle: "Account and preferences",
                  settingsDescription: "Language, cloud, security, notifications, Arena, and privacy organized by priority.",
                  openControls: "Open",
                  closeControls: "Close",
                  localMode: "Local mode",
                  cloudReady: "Cloud ready",
                  cloudSyncing: "Syncing",
                  cloudIssue: "Cloud needs attention",
                  cloudPending: "Waiting to sync",
                  remindersOn: "Reminders on",
                  remindersOff: "Reminders paused",
                  arenaOn: "Arena active",
                  arenaOff: "Arena off",
                  activeHabits: "Active habits",
                  friendsLabel: "Network",
                  consistencyHint: "Rhythm of active days this year",
                  checkinsHint: "Total output across your journey",
                  habitsHint: "Systems currently in motion",
                  friendsHint: "People connected to your progress",
                  streakHint: "Best sequence across habits",
                  daysHint: "Days with recorded activity",
                  profileHandleHint: "Your tag appears across social and Arena.",
                  profileNameHint: "Use a short, recognizable display name.",
                  connected: "Connected",
                  guest: "Guest mode",
                  saveTag: "Save",
                  sameTag: "That is already your tag.",
                  tagSaved: "Tag updated successfully!",
                  tagError: "Failed to update tag.",
                  profileFallbackName: "Zenith user",
                  noUsername: "no-tag",
                  passwordModalDescription: "Update the key you use to access Zenith Cloud.",
                  supportTitle: "Support",
                  supportDescription: "Questions, ideas, and direct feedback for the team.",
                  blockedTitle: "Blocked users",
                  blockedEmpty: "No blocked users.",
                  unblock: "Unblock",
                  awardsSingular: "Award",
                  awardsPlural: "Awards",
                  seasonAwardsTitle: "Arena history",
                  seasonAwardsDescription: "A record of your competitive rewards across seasons.",
                  cloudSummaryDescription: "Connection status and sync health for your account.",
                  notificationsSummaryDescription: "Keep reminders useful without turning them into friction.",
                  arenaSummaryDescription: "Control competitive participation and visibility.",
                  securitySummaryDescription: "Protect access and keep your account secure.",
              };

    const fetchBlockedUsers = useCallback(async () => {
        if (!jwt) return;

        try {
            const res = await fetch(`${API_URL}/friends/blocked`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const data = (await res.json().catch(() => ({}))) as { blocked?: BlockedUser[] };
            if (res.ok) setBlockedUsers(data.blocked || []);
        } catch (error) {
            console.error("Failed to fetch blocked users:", error);
        }
    }, [jwt]);

    useEffect(() => {
        setMounted(true);
        setNameInput(userName);
        setUsernameInput(username || "");
    }, [userName, username]);

    useEffect(() => {
        if (jwt) {
            fetchBlockedUsers();
        }
    }, [fetchBlockedUsers, jwt]);

    const handleUnblock = async (userId: string) => {
        setUnblockingId(userId);

        try {
            const res = await fetch(`${API_URL}/friends/unblock`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ unblockedUserId: userId }),
            });

            if (res.ok) {
                setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));
            }
        } catch (error) {
            console.error("Failed to unblock user:", error);
        } finally {
            setUnblockingId(null);
        }
    };

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

        return () => clearTimeout(debounceTimer);
    }, [username, usernameInput]);

    const fetchRewards = useCallback(async () => {
        setIsLoadingRewards(true);
        try {
            const res = await fetch(`${API_URL}/users/me/rewards`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            if (res.ok) {
                const data = (await res.json().catch(() => [])) as ArenaReward[];
                setRewards(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching rewards:", error);
        } finally {
            setIsLoadingRewards(false);
        }
    }, [jwt]);

    useEffect(() => {
        if (jwt) {
            fetchRewards();
        }
    }, [fetchRewards, jwt]);

    const logsByHabit = useMemo(() => {
        const grouped: Record<string, typeof logs> = {};
        logs.forEach((log) => {
            if (!grouped[log.habitId]) grouped[log.habitId] = [];
            grouped[log.habitId].push(log);
        });
        return grouped;
    }, [logs]);

    const activeHabits = useMemo(() => habits.filter((habit) => habit.isActive), [habits]);
    const totalCompletions = logs.length;
    const bestStreakAllHabits = useMemo(
        () =>
            activeHabits.reduce((max, habit) => {
                return Math.max(max, getBestStreak(logsByHabit[habit.id] || [], habit));
            }, 0),
        [activeHabits, logsByHabit]
    );
    const yearlyStats = useMemo(() => getYearlyStats(logs, new Date()), [logs]);

    const currentRank = getRankForLevel(level);
    const currentRankDescription = language === "en" ? EN_RANK_DESCRIPTIONS[currentRank.name] ?? currentRank.description : currentRank.description;
    const levelProgress = getLevelProgress(totalXP, level);
    const xpInLevel = totalXP - getXPNeededForLevel(level);
    const xpRequiredForNext = getXpToNextLevel(level);
    const friendsCount = friends?.length || 0;
    const displayName = nameInput.trim() || userName || copy.profileFallbackName;
    const profileInitial = (displayName || username || "Z").trim().charAt(0).toUpperCase() || "Z";
    const normalizedUsername = usernameInput.trim().toLowerCase();
    const hasUsernameChanged = normalizedUsername !== (username?.toLowerCase() ?? "");
    const usernameSaveEnabled = hasUsernameChanged && normalizedUsername.length >= 3 && Boolean(isUsernameAvailable);
    const syncTimeLabel =
        lastSyncedAt > 0
            ? new Date(lastSyncedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : t.settings.pending;

    const cloudStatus =
        !jwt
            ? {
                  label: copy.localMode,
                  detail: t.settings.protect,
                  tone: "neutral" as Tone,
              }
            : syncStatus === "syncing"
              ? {
                    label: copy.cloudSyncing,
                    detail: t.common.loading,
                    tone: "positive" as Tone,
                }
              : syncStatus === "error"
                ? {
                      label: copy.cloudIssue,
                      detail: t.common.error,
                      tone: "danger" as Tone,
                  }
                : lastSyncedAt > 0
                  ? {
                        label: copy.cloudReady,
                        detail: `${t.settings.lastSync}: ${syncTimeLabel}`,
                        tone: "positive" as Tone,
                    }
                  : {
                        label: copy.cloudPending,
                        detail: `${t.settings.lastSync}: ${t.settings.pending}`,
                        tone: "warning" as Tone,
                    };

    const reminderStatus = isMorningReminderActive
        ? {
              label: copy.remindersOn,
              detail: morningReminderTime || "09:00",
              tone: "positive" as Tone,
          }
        : {
              label: copy.remindersOff,
              detail: t.settings.notifications.morningReminderDesc,
              tone: "neutral" as Tone,
          };

    const arenaStatus = optInLeaderboard
        ? {
              label: copy.arenaOn,
              detail: `${currentRank.name} • ${arenaPoints} pts`,
              tone: "positive" as Tone,
          }
        : {
              label: copy.arenaOff,
              detail: t.arena.notParticipating,
              tone: "neutral" as Tone,
          };

    const overviewCards: Array<{
        icon: LucideIcon;
        label: string;
        value: string | number;
        detail: string;
        tone: Tone;
    }> = [
        {
            icon: Flame,
            label: t.stats.bestSequence,
            value: `${bestStreakAllHabits}d`,
            detail: copy.streakHint,
            tone: bestStreakAllHabits >= 30 ? "warning" : bestStreakAllHabits >= 7 ? "positive" : "neutral",
        },
        {
            icon: Target,
            label: t.stats.consistency,
            value: `${yearlyStats.productivityPercentage}%`,
            detail: copy.consistencyHint,
            tone: yearlyStats.productivityPercentage >= 70 ? "positive" : "neutral",
        },
        {
            icon: Calendar,
            label: t.stats.focusDays,
            value: yearlyStats.activeDays,
            detail: copy.daysHint,
            tone: "neutral",
        },
        {
            icon: Target,
            label: t.stats.totalCompleted,
            value: totalCompletions,
            detail: copy.checkinsHint,
            tone: "neutral",
        },
        {
            icon: Flame,
            label: copy.activeHabits,
            value: activeHabits.length,
            detail: copy.habitsHint,
            tone: activeHabits.length >= 4 ? "positive" : "neutral",
        },
        {
            icon: Users,
            label: copy.friendsLabel,
            value: friendsCount,
            detail: copy.friendsHint,
            tone: friendsCount > 0 ? "neutral" : "warning",
        },
    ];

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
        const clean = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (!clean || clean.length < 3) return;

        if (isUsernameAvailable || clean === username?.toLowerCase()) {
            if (clean === username?.toLowerCase()) {
                setUsernameMessage({ text: copy.sameTag, type: "info" });
                return;
            }

            setIsSavingUsername(true);
            try {
                await setUsername(clean);
                deviceHaptics.success();
                setUsernameMessage({ text: copy.tagSaved, type: "success" });
                setTimeout(() => setUsernameMessage(null), 3000);
            } catch (error) {
                deviceHaptics.error();
                setUsernameMessage({ text: copy.tagError, type: "error" });
            } finally {
                setIsSavingUsername(false);
            }
        }
    };

    const handleExportData = () => {
        const data = { habits, logs };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `zenith-export-${new Date().toISOString().split("T")[0]}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteAccount = async () => {
        if (!jwt) {
            logout();
            router.push("/login");
            return;
        }

        if (!deletePassword) return;

        setShowDeleteConfirm(false);
        setIsDeleting(true);

        try {
            const res = await fetch(`${API_URL}/auth/account`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ password: deletePassword }),
            });

            if (res.ok) {
                logout();
                router.push("/login");
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
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
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

    if (!mounted) return null;

    return (
        <main className="app-page relative min-h-[100dvh] overflow-x-hidden text-white">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.045] to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-20 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.16)_0%,rgba(16,185,129,0.05)_34%,transparent_68%)] blur-3xl" />

            <div className="app-main-spacing relative z-10">
                <div className="app-shell">
                    <motion.header
                        className="mb-6 flex items-center gap-3"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, type: "spring", bounce: 0.18 }}
                    >
                        <button
                            onClick={() => router.push("/")}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/58 transition-colors hover:text-white"
                            aria-label="Back to Home"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>

                        <div className="min-w-0 flex-1">
                            <p className="app-kicker">{copy.heroEyebrow}</p>
                            <h1 className="mt-2 text-[clamp(2rem,7vw,3rem)] font-semibold tracking-[-0.07em] text-white">{copy.title}</h1>
                        </div>
                    </motion.header>

                    <div className="space-y-4 pb-32">
                        <motion.section
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.04, type: "spring", bounce: 0.16 }}
                            className="app-card overflow-hidden rounded-[36px] p-6"
                        >
                            <SectionHeading
                                eyebrow={copy.heroEyebrow}
                                title={copy.heroTitle}
                                description={copy.heroDescription}
                            />

                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 rounded-[34px] bg-[var(--zenith-active)]/15 blur-2xl" />
                                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/12 bg-gradient-to-br from-white/12 to-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                                        <span className="text-[2.1rem] font-semibold tracking-[-0.08em] text-white">{profileInitial}</span>
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate text-[clamp(1.8rem,8vw,3rem)] font-semibold leading-none tracking-[-0.08em] text-white">
                                            {displayName}
                                        </h2>
                                        <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/62">
                                            LV {level}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-[color:rgba(var(--zenith-active-rgb),0.2)] bg-[color:rgba(var(--zenith-active-rgb),0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--zenith-active)]">
                                            {currentRank.name}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/48">
                                            {jwt ? copy.connected : copy.guest}
                                        </span>
                                    </div>

                                    <p className="mt-4 max-w-[32rem] text-sm leading-relaxed text-white/48">{currentRankDescription}</p>
                                    <p className="mt-2 font-mono text-sm text-white/34">@{username || copy.noUsername}</p>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <StatusCard icon={Cloud} label={t.settings.cloudSync} detail={cloudStatus.detail} tone={cloudStatus.tone} />
                                <StatusCard icon={Bell} label={t.settings.notifications.title} detail={reminderStatus.detail} tone={reminderStatus.tone} />
                                <StatusCard icon={Trophy} label={t.arena.title} detail={arenaStatus.detail} tone={arenaStatus.tone} />
                            </div>

                            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="app-kicker">{t.settings.cloudSync}</p>
                                        <p className="mt-3 text-[clamp(3rem,15vw,4.75rem)] font-semibold leading-none tracking-[-0.1em] text-white">
                                            {level}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.settings.pending}</p>
                                        <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-white/82">
                                            {Math.round(levelProgress * 100)}%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">XP</p>
                                        <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-white">
                                            {xpInLevel}
                                            <span className="text-white/25"> / {xpRequiredForNext}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Total</p>
                                        <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-white">{totalXP} ZP</p>
                                    </div>
                                </div>

                                <div className="mt-5 h-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.05] p-[2px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(levelProgress * 100, 4)}%` }}
                                        transition={{ duration: 0.9, ease: "easeOut" }}
                                        className="relative h-full rounded-full bg-gradient-to-r from-[var(--zenith-active)]/45 to-[var(--zenith-active)]"
                                    >
                                        <div className="absolute inset-0 animate-pulse bg-white/15" />
                                    </motion.div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-white/42">
                                    <span>{currentRankDescription}</span>
                                    <span className="font-semibold text-white/68">{currentRank.name}</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                                    <p className="app-kicker">{t.auth.name}</p>
                                    <input
                                        type="text"
                                        value={nameInput}
                                        onChange={(event) => setNameInput(event.target.value)}
                                        onBlur={handleSaveName}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                (event.currentTarget as HTMLInputElement).blur();
                                            }
                                        }}
                                        placeholder={t.settings.namePlaceholder}
                                        className="mt-4 w-full bg-transparent text-[1.7rem] font-semibold tracking-[-0.07em] text-white outline-none placeholder:text-white/18"
                                        maxLength={24}
                                    />
                                    <p className="mt-2 text-[11px] leading-relaxed text-white/36">{copy.profileNameHint}</p>
                                </div>

                                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="app-kicker">Tag</p>
                                            <p className="mt-2 text-[11px] leading-relaxed text-white/36">{copy.profileHandleHint}</p>
                                        </div>
                                        {usernameSaveEnabled ? (
                                            <button
                                                onClick={handleSaveUsername}
                                                disabled={isSavingUsername || isCheckingUsername}
                                                className="rounded-2xl bg-[var(--zenith-active)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-transform active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {isSavingUsername ? "..." : copy.saveTag}
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 text-[1.25rem] font-mono text-white/78">
                                        <span className="text-white/30">@</span>
                                        <input
                                            type="text"
                                            value={usernameInput}
                                            onChange={(event) => {
                                                setUsernameInput(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                                                setUsernameMessage(null);
                                            }}
                                            placeholder="username"
                                            className="w-full bg-transparent tracking-[-0.04em] outline-none placeholder:text-white/18"
                                            maxLength={20}
                                        />
                                    </div>

                                    {(isCheckingUsername || isUsernameAvailable !== null || usernameMessage) ? (
                                        <div className="mt-3 flex items-center gap-2 text-[11px]">
                                            {isCheckingUsername ? (
                                                <>
                                                    <div className="h-1.5 w-1.5 rounded-full bg-white/25 animate-pulse" />
                                                    <span className="font-semibold uppercase tracking-[0.18em] text-white/36">{t.settings.usernameChecking}</span>
                                                </>
                                            ) : usernameMessage ? (
                                                <>
                                                    <div
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            usernameMessage.type === "success"
                                                                ? "bg-green-500"
                                                                : usernameMessage.type === "error"
                                                                  ? "bg-red-500"
                                                                  : "bg-blue-400"
                                                        }`}
                                                    />
                                                    <span
                                                        className={`font-semibold uppercase tracking-[0.18em] ${
                                                            usernameMessage.type === "success"
                                                                ? "text-green-500/80"
                                                                : usernameMessage.type === "error"
                                                                  ? "text-red-500/80"
                                                                  : "text-blue-400/80"
                                                        }`}
                                                    >
                                                        {usernameMessage.text}
                                                    </span>
                                                </>
                                            ) : isUsernameAvailable ? (
                                                <>
                                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                    <span className="font-semibold uppercase tracking-[0.18em] text-green-500/80">{t.settings.usernameAvailable}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                                    <span className="font-semibold uppercase tracking-[0.18em] text-red-500/80">
                                                        {usernameInput.length < 3 ? t.settings.usernameShort : t.settings.usernameTaken}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.08, type: "spring" }}
                        >
                            <SectionHeading
                                eyebrow={copy.performanceEyebrow}
                                title={copy.performanceTitle}
                                description={copy.performanceDescription}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                {overviewCards.map((card, index) => (
                                    <MetricCard
                                        key={card.label}
                                        icon={card.icon}
                                        label={card.label}
                                        value={card.value}
                                        detail={card.detail}
                                        tone={card.tone}
                                        delay={0.1 + index * 0.03}
                                    />
                                ))}
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.42, delay: 0.1, type: "spring" }}
                        >
                            <SectionHeading
                                eyebrow={copy.arenaEyebrow}
                                title={copy.arenaTitle}
                                description={copy.arenaDescription}
                            />

                            <div className="space-y-4">
                                <div className="app-card-soft rounded-[32px] p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="app-kicker">{t.arena.title}</p>
                                            <h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-white">{t.arena.subtitle}</h3>
                                            <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">{t.arena.visibilityNote}</p>
                                        </div>

                                        <button
                                            onClick={() => router.push("/leaderboard")}
                                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                        >
                                            {t.arena.title}
                                        </button>
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-3">
                                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.arena.myTier}</p>
                                            <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-white">{optInLeaderboard ? currentRank.name : "--"}</p>
                                        </div>
                                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.arena.myScore}</p>
                                            <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-white">{optInLeaderboard ? arenaPoints : 0}</p>
                                        </div>
                                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.arena.championsWall}</p>
                                            <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-white">{rewards.length}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {optInLeaderboard ? (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`${t.arena.optOutTitle} ${t.arena.optOutDescription}`)) {
                                                        setOptInLeaderboard(false);
                                                    }
                                                }}
                                                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-400 transition-colors hover:bg-red-500/16"
                                            >
                                                {t.arena.optOutConfirm}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setOptInLeaderboard(true)}
                                                className="rounded-2xl bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-transform active:scale-[0.98]"
                                            >
                                                {t.arena.joinCta}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="app-card-soft rounded-[32px] p-5">
                                    <TrophyWall />
                                </div>

                                {(isLoadingRewards || rewards.length > 0) ? (
                                    <div className="app-card-soft rounded-[32px] p-5">
                                        <SectionHeading
                                            eyebrow={t.arena.championsWall}
                                            title={copy.seasonAwardsTitle}
                                            description={copy.seasonAwardsDescription}
                                            action={
                                                isLoadingRewards ? (
                                                    <Loader2 size={14} className="animate-spin text-white/35" />
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--zenith-active)]">
                                                        {rewards.length} {rewards.length === 1 ? copy.awardsSingular : copy.awardsPlural}
                                                    </span>
                                                )
                                            }
                                        />

                                        {isLoadingRewards ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                {[0, 1, 2, 3].map((item) => (
                                                    <div key={item} className="h-28 animate-pulse rounded-[24px] border border-white/5 bg-white/[0.03]" />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                {rewards.map((reward) => {
                                                    const seasonLabel =
                                                        reward.season_name || `${language === "pt" ? "Época" : "Season"} ${reward.season_id}`;

                                                    return (
                                                        <div
                                                            key={reward.id || `${reward.season_id}-${reward.rank_name}-${reward.position}`}
                                                            className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-center"
                                                        >
                                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white/12 to-transparent">
                                                                <Trophy size={18} className={(reward.position || 0) <= 3 ? "text-yellow-400" : "text-white/35"} />
                                                            </div>
                                                            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/84">{reward.rank_name}</p>
                                                            <p className="mt-1 text-[10px] font-semibold text-white/34">{seasonLabel}</p>
                                                            {reward.position ? (
                                                                <div className="mt-3 inline-flex rounded-full border border-[var(--zenith-active)]/20 bg-[var(--zenith-active)]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--zenith-active)]">
                                                                    #{reward.position} Global
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.42, delay: 0.12, type: "spring" }}
                            className="app-card-soft rounded-[32px] p-5"
                        >
                            <SectionHeading
                                eyebrow={copy.settingsEyebrow}
                                title={copy.settingsTitle}
                                description={copy.settingsDescription}
                                action={
                                    <button
                                        onClick={() => setShowSettings((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                    >
                                        {showSettings ? copy.closeControls : copy.openControls}
                                        {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                }
                            />

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <StatusCard icon={Cloud} label={cloudStatus.label} detail={copy.cloudSummaryDescription} tone={cloudStatus.tone} />
                                <StatusCard icon={Bell} label={reminderStatus.label} detail={copy.notificationsSummaryDescription} tone={reminderStatus.tone} />
                                <StatusCard icon={Trophy} label={arenaStatus.label} detail={copy.arenaSummaryDescription} tone={arenaStatus.tone} />
                            </div>
                        </motion.section>

                        <AnimatePresence>
                            {showSettings ? (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.28, ease: "easeInOut" }}
                                    className="overflow-hidden space-y-4"
                                >
                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <SectionHeading
                                            eyebrow={t.settings.language}
                                            title={t.settings.language}
                                            description={copy.supportDescription}
                                        />

                                        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/42">
                                                    <Globe className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-semibold tracking-[-0.03em] text-white">Zenith UI</h3>
                                                    <p className="mt-1 text-sm text-white/42">{copy.supportTitle}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                                                <button
                                                    onClick={() => setLanguage("pt")}
                                                    className={`rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                                                        language === "pt" ? "bg-white text-black" : "text-white/50 hover:text-white"
                                                    }`}
                                                >
                                                    PT
                                                </button>
                                                <button
                                                    onClick={() => setLanguage("en")}
                                                    className={`rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                                                        language === "en" ? "bg-white text-black" : "text-white/50 hover:text-white"
                                                    }`}
                                                >
                                                    EN
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/42">
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{copy.supportTitle}</p>
                                                    <p className="mt-2 text-sm leading-relaxed text-white/45">{copy.supportDescription}</p>
                                                </div>
                                                <a
                                                    href="mailto:zenithstartuo@gmail.com"
                                                    onClick={() => deviceHaptics.lightImpact()}
                                                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                                >
                                                    {t.settings.support.contactUs}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <SectionHeading
                                            eyebrow="Zenith Cloud"
                                            title={jwt ? t.settings.cloudSyncActive : t.settings.cloudSync}
                                            description={copy.cloudSummaryDescription}
                                        />

                                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] ${getToneClasses(cloudStatus.tone).icon}`}>
                                                        <Cloud className={`h-5 w-5 ${syncStatus === "syncing" ? "animate-pulse" : ""}`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-semibold tracking-[-0.03em] text-white">{cloudStatus.label}</h3>
                                                        <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">
                                                            {jwt
                                                                ? `${t.settings.lastSync}: ${syncTimeLabel}`
                                                                : t.settings.protect}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {jwt ? (
                                                        <button
                                                            onClick={() => logout()}
                                                            className="rounded-2xl border border-red-500/15 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-400 transition-colors hover:bg-red-500/16"
                                                        >
                                                            {t.settings.logout}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => router.push("/login")}
                                                            className="rounded-2xl bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-transform active:scale-[0.98]"
                                                        >
                                                            {t.auth.submitLogin}
                                                        </button>
                                                    )}

                                                    {jwt ? (
                                                        <button
                                                            onClick={() => syncWithCloud()}
                                                            disabled={syncStatus === "syncing"}
                                                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                                                        >
                                                            {syncStatus === "syncing" ? t.common.loading : t.settings.forceSync}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <SectionHeading
                                            eyebrow={t.settings.notifications.title}
                                            title={t.settings.notifications.morningReminder}
                                            description={copy.notificationsSummaryDescription}
                                        />

                                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] ${getToneClasses(reminderStatus.tone).icon}`}>
                                                        <Bell className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-semibold tracking-[-0.03em] text-white">{reminderStatus.label}</h3>
                                                        <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">
                                                            {t.settings.notifications.morningReminderDesc}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    {isMorningReminderActive ? (
                                                        <input
                                                            type="time"
                                                            value={morningReminderTime || "09:00"}
                                                            onChange={async (event) => {
                                                                const newTime = event.target.value;
                                                                setMorningReminderTime(newTime);
                                                                await scheduleAllNotifications(habits, true, newTime);
                                                            }}
                                                            className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white/85 outline-none"
                                                        />
                                                    ) : null}

                                                    <button
                                                        onClick={handleReminderToggle}
                                                        className={`relative h-7 w-14 rounded-full transition-colors ${
                                                            isMorningReminderActive ? "bg-[var(--zenith-active)]" : "bg-white/18"
                                                        }`}
                                                    >
                                                        <motion.div
                                                            className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm"
                                                            initial={false}
                                                            animate={{ x: isMorningReminderActive ? 28 : 0 }}
                                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                        />
                                                    </button>

                                                    <button
                                                        onClick={async () => await sendTestNotification()}
                                                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                                    >
                                                        {t.settings.notifications.test}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <SectionHeading
                                            eyebrow={t.arena.title}
                                            title={t.arena.myPerformance}
                                            description={copy.arenaSummaryDescription}
                                        />

                                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] ${getToneClasses(arenaStatus.tone).icon}`}>
                                                        <Trophy className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-semibold tracking-[-0.03em] text-white">{arenaStatus.label}</h3>
                                                        <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">
                                                            {optInLeaderboard ? `${arenaPoints} pts • ${currentRank.name}` : t.arena.notParticipating}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => router.push("/leaderboard")}
                                                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                                    >
                                                        {t.arena.title}
                                                    </button>

                                                    {optInLeaderboard ? (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`${t.arena.optOutTitle} ${t.arena.optOutDescription}`)) {
                                                                    setOptInLeaderboard(false);
                                                                }
                                                            }}
                                                            className="rounded-2xl border border-red-500/15 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-400 transition-colors hover:bg-red-500/16"
                                                        >
                                                            {t.arena.optOutConfirm}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setOptInLeaderboard(true)}
                                                            className="rounded-2xl bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-transform active:scale-[0.98]"
                                                        >
                                                            {t.arena.joinCta}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {jwt ? (
                                        <div className="app-card-soft rounded-[30px] p-5">
                                            <SectionHeading
                                                eyebrow={t.settings.security.title}
                                                title={t.settings.security.changePassword}
                                                description={copy.securitySummaryDescription}
                                            />

                                            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/42">
                                                            <Lock className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-semibold tracking-[-0.03em] text-white">{t.settings.security.changePassword}</h3>
                                                            <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">
                                                                {copy.securitySummaryDescription}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setShowPasswordConfirm(true)}
                                                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                                    >
                                                        {t.common.edit}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <SectionHeading
                                            eyebrow={copy.blockedTitle}
                                            title={copy.blockedTitle}
                                            description={language === "pt" ? "Controlo de privacidade e limpeza da tua rede." : "Privacy controls and cleanup for your network."}
                                        />

                                        <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]">
                                            {blockedUsers.length === 0 ? (
                                                <div className="flex items-center gap-4 p-5 text-white/25">
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                                                        <ShieldOff className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-sm font-medium">{copy.blockedEmpty}</span>
                                                </div>
                                            ) : (
                                                blockedUsers.map((user, index) => (
                                                    <div
                                                        key={user.id}
                                                        className={`flex items-center justify-between gap-4 px-5 py-4 ${
                                                            index < blockedUsers.length - 1 ? "border-b border-white/5" : ""
                                                        }`}
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-sm font-semibold text-white/55">
                                                                {user.name?.[0]?.toUpperCase() || "?"}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-white/72">{user.name}</p>
                                                                <p className="truncate font-mono text-[11px] text-white/34">@{user.username}</p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => handleUnblock(user.id)}
                                                            disabled={unblockingId === user.id}
                                                            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-[var(--zenith-active)]/10 hover:text-[var(--zenith-active)] disabled:opacity-45"
                                                        >
                                                            {unblockingId === user.id ? <Loader2 size={12} className="animate-spin" /> : null}
                                                            {copy.unblock}
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="app-card-soft rounded-[30px] border border-red-500/16 p-5">
                                        <SectionHeading
                                            eyebrow={t.settings.dangerZone.title}
                                            title={t.settings.dangerZone.title}
                                            description={t.settings.dangerZone.deleteWarning}
                                        />

                                        <div className="space-y-4">
                                            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <h3 className="text-base font-semibold tracking-[-0.03em] text-white">{t.settings.dangerZone.exportData}</h3>
                                                        <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">{t.settings.dangerZone.exportDesc}</p>
                                                    </div>
                                                    <button
                                                        onClick={handleExportData}
                                                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.08]"
                                                    >
                                                        {t.settings.export}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="rounded-[24px] border border-red-500/12 bg-red-500/[0.04] p-5">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <h3 className="text-base font-semibold tracking-[-0.03em] text-red-400">{t.settings.dangerZone.deleteAccount}</h3>
                                                        <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-white/45">{t.settings.dangerZone.deleteWarning}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(true)}
                                                        className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-400 transition-colors hover:bg-red-500/16"
                                                    >
                                                        {isDeleting ? t.common.loading : t.common.delete}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                }}
                onConfirm={handleDeleteAccount}
                title={t.settings.dangerZone.deleteAccount}
                description={t.settings.dangerZone.deleteWarning}
                confirmLabel={t.settings.dangerZone.deleteAction}
                cancelLabel={t.common.cancel}
            >
                {jwt ? (
                    <div className="mt-6 w-full text-left">
                        <label className="ml-1 mb-2 block text-xs font-bold uppercase tracking-widest text-white/40">
                            {t.settings.dangerZone.passwordConfirm}
                        </label>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(event) => setDeletePassword(event.target.value)}
                            placeholder="••••••••"
                            className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition-colors focus:border-red-500/50"
                            autoFocus
                        />
                    </div>
                ) : null}
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
                title={t.settings.security.changePassword}
                description={copy.passwordModalDescription}
                confirmLabel={isChangingPassword ? t.common.loading : t.settings.security.changeAction}
                cancelLabel={t.common.cancel}
                isDanger={false}
            >
                <div className="mt-6 w-full space-y-4 text-left">
                    <div>
                        <label className="ml-1 mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {t.settings.security.currentPassword}
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords ? "text" : "password"}
                                value={currentPassword}
                                onChange={(event) => setCurrentPassword(event.target.value)}
                                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-12 text-white outline-none transition-colors focus:border-[var(--zenith-active)]/50"
                            />
                            <button
                                onClick={() => setShowPasswords((prev) => !prev)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/24"
                            >
                                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-2">
                        <label className="ml-1 mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {t.settings.security.newPassword}
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition-colors focus:border-[var(--zenith-active)]/50"
                        />
                    </div>

                    <div>
                        <label className="ml-1 mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {t.settings.security.confirmNewPassword}
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(event) => setConfirmNewPassword(event.target.value)}
                            className={`h-14 w-full rounded-2xl border bg-white/5 px-4 text-white outline-none transition-colors ${
                                confirmNewPassword && newPassword === confirmNewPassword ? "border-green-500/50" : "border-white/10"
                            }`}
                        />
                    </div>

                    {passwordError ? (
                        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-center text-xs font-bold text-red-400">
                            {passwordError}
                        </p>
                    ) : null}
                </div>
            </ConfirmationModal>
        </main>
    );
}
