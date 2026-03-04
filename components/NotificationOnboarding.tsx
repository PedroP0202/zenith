"use client";

import { useStore } from "@/store/useStore";
import { useState, useEffect } from "react";
import { requestNotificationPermissions, scheduleAllNotifications } from "@/utils/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

export default function NotificationOnboarding() {
    const {
        habits,
        hasPromptedForNotifications,
        setHasPromptedForNotifications,
        setMorningReminder,
        morningReminderTime
    } = useStore();

    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Ensure we only show this IF they have at least 1 habit, AND haven't been asked yet.
        if (habits.length > 0 && !hasPromptedForNotifications) {
            // Apply a minor delay so it doesn't jarringly pop up immediately upon adding a habit
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [mounted, habits.length, hasPromptedForNotifications]);

    const handleAccept = async () => {
        setIsVisible(false);
        setHasPromptedForNotifications(true);

        // This invokes the actual Apple prompt if needed
        const granted = await requestNotificationPermissions();
        if (granted) {
            setMorningReminder(true);
            await scheduleAllNotifications(habits, true, morningReminderTime);
        }
    };

    const handleDecline = () => {
        setIsVisible(false);
        setHasPromptedForNotifications(true); // Never ask again across the UI
    };

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 150, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 150, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed bottom-28 left-0 right-0 px-6 z-50 flex justify-center"
                >
                    <div className="bg-[#1A1A1A] border border-white/10 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-white/80" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-medium text-white mb-1">Morning Routine</h3>
                                <p className="text-[13px] text-white/50 leading-relaxed">
                                    Want a quiet daily nudge to review your streak and do the work?
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleDecline}
                                className="flex-1 py-3 px-4 rounded-xl text-[13px] font-medium text-white/50 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                Not now
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex-1 py-3 px-4 rounded-xl text-[13px] font-medium text-black bg-white hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Enable Alerts
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
