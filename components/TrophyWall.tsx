"use client";

import { useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { Award, Flame, Layout, Lock, Sparkles, Trophy as TrophyIcon, Users } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { useStore } from "@/store/useStore";
import { TROPHIES, getUnlockedTrophies } from "@/utils/achievements";

const ICON_MAP: Record<string, ElementType> = {
    Flame,
    Trophy: TrophyIcon,
    Award,
    Sparkles,
    Users,
    Layout,
};

export default function TrophyWall({ unlockedIds: externalUnlockedIds }: { unlockedIds?: string[] }) {
    const { habits, logs, friends } = useStore();
    const { language } = useTranslation();
    const [selectedTrophy, setSelectedTrophy] = useState<string | null>(null);

    const copy =
        language === "pt"
            ? {
                  title: "Mural de Troféus",
                  subtitle: "Marcos que mostram a profundidade e consistência da tua jornada.",
                  locked: "Fechado",
                  unlocked: "Desbloqueado",
              }
            : {
                  title: "Trophy Wall",
                  subtitle: "Milestones that show the depth and consistency of your journey.",
                  locked: "Locked",
                  unlocked: "Unlocked",
              };

    const unlockedIds = externalUnlockedIds
        ? new Set(externalUnlockedIds)
        : new Set(getUnlockedTrophies(habits, logs, friends).map((trophy) => trophy.id));

    const unlockedCount = unlockedIds.size;
    const progress = Math.round((unlockedCount / TROPHIES.length) * 100);

    return (
        <div className="w-full">
            <div className="flex items-start justify-between gap-4 px-1">
                <div>
                    <p className="app-kicker">{copy.title}</p>
                    <p className="mt-2 max-w-[30rem] text-sm leading-relaxed text-white/42">{copy.subtitle}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/58">
                    {unlockedCount}/{TROPHIES.length}
                </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-full border border-white/8 bg-white/[0.04] p-[2px]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(progress, 4)}%` }}
                    transition={{ duration: 0.85, type: "spring" }}
                    className="h-2 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400"
                />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
                {TROPHIES.map((trophy, index) => {
                    const isUnlocked = unlockedIds.has(trophy.id);
                    const Icon = ICON_MAP[trophy.icon] || TrophyIcon;
                    const isSelected = selectedTrophy === trophy.id;

                    return (
                        <div key={trophy.id} className="relative flex flex-col items-center">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35, delay: index * 0.05, type: "spring" }}
                                onClick={() => setSelectedTrophy(isSelected ? null : trophy.id)}
                                className={`relative flex h-28 w-full flex-col items-center justify-center gap-2 rounded-[24px] border p-3 text-center transition-all ${
                                    isUnlocked
                                        ? "border-white/14 bg-gradient-to-b from-white/[0.1] to-white/[0.03] shadow-[0_18px_40px_rgba(0,0,0,0.2)]"
                                        : "border-white/6 bg-white/[0.02] opacity-70 grayscale"
                                } ${isSelected ? "scale-[1.03] ring-1 ring-white/25" : "hover:scale-[1.02]"}`}
                            >
                                <div
                                    className="flex h-11 w-11 items-center justify-center rounded-full border shadow-inner"
                                    style={{
                                        backgroundColor: isUnlocked ? `${trophy.color}18` : "rgba(255,255,255,0.05)",
                                        borderColor: isUnlocked ? `${trophy.color}55` : "rgba(255,255,255,0.08)",
                                    }}
                                >
                                    {isUnlocked ? (
                                        <Icon size={20} color={trophy.color} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]" />
                                    ) : (
                                        <Lock size={16} className="text-white/20" />
                                    )}
                                </div>

                                <span className={`text-[10px] font-bold leading-tight ${isUnlocked ? "text-white/88" : "text-white/30"}`}>
                                    {trophy.title}
                                </span>

                                <span
                                    className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] ${
                                        isUnlocked
                                            ? "border border-white/10 bg-white/[0.05] text-white/46"
                                            : "border border-white/6 bg-white/[0.03] text-white/24"
                                    }`}
                                >
                                    {isUnlocked ? copy.unlocked : copy.locked}
                                </span>
                            </motion.button>

                            {isSelected ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="app-card absolute left-1/2 top-[7.4rem] z-50 w-52 -translate-x-1/2 rounded-[22px] p-4"
                                >
                                    <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-white/10 bg-[#111113]" />
                                    <div className="relative z-10">
                                        <h4 className="flex items-center gap-2 text-xs font-bold text-white">
                                            {isUnlocked ? <Icon size={12} color={trophy.color} /> : <Lock size={12} className="text-white/35" />}
                                            {trophy.title}
                                        </h4>
                                        <p className="mt-2 text-[11px] leading-relaxed text-white/48">{trophy.description}</p>
                                    </div>
                                </motion.div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {selectedTrophy ? <div className="fixed inset-0 z-40" onClick={() => setSelectedTrophy(null)} /> : null}
        </div>
    );
}
