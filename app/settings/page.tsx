"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Bell, ChevronLeft, UserIcon, Cloud, Globe, Shield } from "lucide-react";
import { scheduleAllNotifications, cancelAllNotifications, requestNotificationPermissions, sendTestNotification } from "@/utils/notifications";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/locales";
import { API_URL } from "@/utils/constants";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function SettingsPage() {
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
        isAppLockEnabled,
        setAppLockEnabled
    } = useStore();
    const [mounted, setMounted] = useState(false);

    // Local ephemeral states for optimistic rendering
    const [nameInput, setNameInput] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setMounted(true);
        setNameInput(userName);
    }, [userName]);

    if (!mounted) return null;

    const handleReminderToggle = async () => {
        const newValue = !isMorningReminderActive;
        // Proceed with internal toggle immediately for fast visual feedback
        setMorningReminder(newValue);

        if (newValue) {
            // Enabled
            const hasPermissions = await requestNotificationPermissions();
            if (hasPermissions) {
                await scheduleAllNotifications(habits, true, morningReminderTime);
            } else {
                // Feature rejected by OS
                setMorningReminder(false);
            }
        } else {
            // Disabled
            await cancelAllNotifications();
        }
    };

    const handleSaveName = () => {
        if (nameInput.trim()) {
            setUserName(nameInput.trim());
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
            // Local fallback
            logout();
            router.push('/login');
            return;
        }

        if (!deletePassword) return;
        setIsDeleting(false); // Reset just in case
        setShowDeleteConfirm(false); // Close modal
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

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 font-sans flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-md flex items-center mb-10 pt-4">
                <button
                    onClick={() => router.push('/')}
                    className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
                    aria-label="Back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 text-center pr-8">
                    <h1 className="text-xl font-medium tracking-tight flex items-center justify-center gap-2">
                        <SettingsIcon className="w-5 h-5 opacity-70" />
                        {t.settings.title}
                    </h1>
                </div>
            </div>

            <div className="w-full max-w-md space-y-8 pb-24">
                {/* Profile Section */}
                <section>
                    <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3 ml-2 font-medium">{t.settings.profile}</h2>
                    <div className="bg-white/[0.03] rounded-3xl p-4 flex flex-col gap-4 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                <UserIcon className="w-5 h-5 opacity-70" />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    onBlur={handleSaveName}
                                    placeholder={t.settings.namePlaceholder}
                                    className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-white/20"
                                    maxLength={24}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Language Section */}
                <section>
                    <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3 ml-2 font-medium">{t.settings.language}</h2>
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
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${language === 'pt' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                            >
                                PT
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${language === 'en' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                            >
                                EN
                            </button>
                        </div>
                    </div>
                </section>

                {/* Cloud Section */}
                <section>
                    <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3 ml-2 font-medium">Zenith Cloud</h2>
                    <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`mt-1 flex-shrink-0 transition-colors ${jwt ? (syncStatus === 'error' ? 'text-red-400' : 'text-[#00C853]') : 'text-white/40'}`}>
                                    <Cloud className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
                                </div>
                                <div>
                                    <h3 className="text-base font-medium">{jwt ? 'Cloud Sync Active' : 'Cloud Sync'}</h3>
                                    <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-[200px]">
                                        {jwt
                                            ? (syncStatus === 'syncing' ? t.common.loading : `Last Sync: ${lastSyncedAt > 0 ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}`)
                                            : `Protect your progress.`}
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
                                <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Vault Status</span>
                                <button
                                    onClick={() => syncWithCloud()}
                                    disabled={syncStatus === 'syncing'}
                                    className="flex items-center gap-2 text-xs font-medium text-[var(--zenith-active)] hover:opacity-80 transition-opacity disabled:opacity-30"
                                >
                                    {syncStatus === 'syncing' ? t.common.loading : 'Force Sync'}
                                    {syncStatus === 'error' && <span className="text-red-400 ml-1">(! Error)</span>}
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Notifications Section */}
                <section>
                    <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3 ml-2 font-medium">{t.settings.notifications.title}</h2>

                    <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex items-center justify-between group transition-colors hover:bg-white/[0.05]">
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

                        {/* Toggle Switch and Time Picker */}
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
                                    aria-label="Reminder Time"
                                />
                            )}
                            <button
                                onClick={handleReminderToggle}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 ${isMorningReminderActive ? 'bg-[var(--zenith-active)]' : 'bg-white/20'
                                    }`}
                                aria-label="Toggle Morning Reminder"
                            >
                                <motion.div
                                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                    initial={false}
                                    animate={{
                                        x: isMorningReminderActive ? 24 : 0
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Test Notification Button */}
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={async () => await sendTestNotification()}
                            className="text-[11px] font-medium text-white/30 tracking-widest uppercase hover:text-white/70 transition-colors border border-white/5 rounded-full px-4 py-2 bg-white/5 active:scale-95"
                        >
                            {t.settings.notifications.test}
                        </button>
                    </div>
                </section>

                {/* Security Section */}
                <section>
                    <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3 ml-2 font-medium">{t.settings.security.title}</h2>
                    <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 flex items-center justify-between group transition-colors hover:bg-white/[0.05]">
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 flex-shrink-0 transition-colors ${isAppLockEnabled ? 'text-[var(--zenith-active)]' : 'text-white/40'}`}>
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-medium">{t.settings.security.appLock}</h3>
                                <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-[200px]">
                                    {t.settings.security.appLockDesc}
                                </p>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setAppLockEnabled(!isAppLockEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 ${isAppLockEnabled ? 'bg-[var(--zenith-active)]' : 'bg-white/20'
                                    }`}
                                aria-label="Toggle App Lock"
                            >
                                <motion.div
                                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                    initial={false}
                                    animate={{
                                        x: isAppLockEnabled ? 24 : 0
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone Section */}
                <section>
                    <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3 ml-2 font-medium">{t.settings.dangerZone.title}</h2>
                    <div className="bg-white/[0.03] rounded-3xl p-5 border border-red-500/20 flex flex-col gap-6">

                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-medium">{t.settings.dangerZone.exportData}</h3>
                                <p className="text-xs text-white/50 mt-1 max-w-[200px] leading-relaxed">{t.settings.dangerZone.exportDesc}</p>
                            </div>
                            <button onClick={handleExportData} className="text-[11px] font-bold text-white bg-white/10 px-4 py-2 rounded-xl transition-colors hover:bg-white/20 active:scale-95 uppercase tracking-wider">
                                Exportar
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
        </main>
    );
}

