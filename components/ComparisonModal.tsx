"use client";

import { useStore } from "@/store/useStore";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, Target, Loader2 } from "lucide-react";
import { API_URL } from "@/utils/constants";
import type { FriendComparisonProfile } from "@/types";

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    friendUsername: string;
    friendName: string;
}

export default function ComparisonModal({ isOpen, onClose, friendUsername, friendName }: ComparisonModalProps) {
    const { jwt, logs, userName } = useStore();
    const [friendData, setFriendData] = useState<FriendComparisonProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchComparison = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/friends/compare/${friendUsername}`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            const data = (await res.json().catch(() => ({}))) as { friend?: FriendComparisonProfile };
            if (res.ok) {
                setFriendData(data.friend || null);
            }
        } catch (e) {
            console.error("Failed to fetch comparison:", e);
        } finally {
            setLoading(false);
        }
    }, [jwt, friendUsername]);

    useEffect(() => {
        if (isOpen && jwt) {
            fetchComparison();
        }
    }, [isOpen, jwt, fetchComparison]);

    if (!isOpen) return null;

    // Calculate My Stats
    const myTotalCompletions = logs.length;
    const friendTotalCompletions = friendData?.habits?.reduce((acc, h) => acc + Number(h.completions || 0), 0) || 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    className="relative w-full max-w-lg bg-zinc-900/90 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 overflow-hidden shadow-2xl"
                >
                    <button onClick={onClose} className="absolute right-6 top-6 p-2 text-white/20 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black tracking-tight mb-1">Duelo de Hábitos</h2>
                        <p className="text-white/40 text-sm uppercase tracking-widest font-bold">
                            Tu vs {friendName ? `${friendName} (@${friendUsername})` : `@${friendUsername}`}
                        </p>
                    </div>

                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--zenith-active)]" />
                            <p className="text-white/40 text-sm animate-pulse">A sintonizar cosmos...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Comparison Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center">
                                    <span className="text-[10px] text-white/30 uppercase font-black mb-4">Tu ({userName})</span>
                                    <span className="text-4xl font-black mb-1">{myTotalCompletions}</span>
                                    <span className="text-[10px] text-white/40 uppercase">Total Focos</span>
                                </div>
                                <div className="p-6 rounded-3xl bg-[var(--zenith-active)]/10 border border-[var(--zenith-active)]/20 flex flex-col items-center">
                                    <span className="text-[10px] text-[var(--zenith-active)]/60 uppercase font-black mb-4">@{friendUsername}</span>
                                    <span className="text-4xl font-black text-[var(--zenith-active)] mb-1">
                                        {friendTotalCompletions}
                                    </span>
                                    <span className="text-[10px] text-[var(--zenith-active)]/60 uppercase">Total Focos</span>
                                </div>
                            </div>

                            {/* Habit Comparison List */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-white/20 ml-2">Anatomia de Progresso</h3>
                                <div className="max-h-60 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {friendData?.habits?.map((habit) => (
                                        <div key={habit.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-bold">{habit.title}</span>
                                                <span className="text-[10px] font-black uppercase text-[var(--zenith-active)]">{habit.completions} Focos</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((Number(habit.completions || 0) / 30) * 100, 100)}%` }}
                                                    className="h-full bg-gradient-to-r from-[var(--zenith-active)] to-cyan-400"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-center">
                                <button 
                                    onClick={onClose}
                                    className="px-8 py-3 bg-white text-black font-black rounded-2xl text-sm transition-transform active:scale-95 shadow-glow-white"
                                >
                                    Fechar Comparação
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
