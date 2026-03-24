"use client";

import { motion } from "framer-motion";
import { TROPHIES, getUnlockedTrophies } from "@/utils/achievements";
import { useStore } from "@/store/useStore";
import { Flame, Trophy as TrophyIcon, Award, Sparkles, Users, Layout, Lock } from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
    Flame,
    Trophy: TrophyIcon,
    Award,
    Sparkles,
    Users,
    Layout,
};

export default function TrophyWall() {
    const { habits, logs, friends } = useStore();
    const unlockedTrophies = getUnlockedTrophies(habits, logs, friends);
    const unlockedIds = new Set(unlockedTrophies.map(t => t.id));
    const [selectedTrophy, setSelectedTrophy] = useState<string | null>(null);

    // Calculate progress (e.g., 3/6)
    const progress = Math.round((unlockedTrophies.length / TROPHIES.length) * 100);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-sm uppercase tracking-widest text-white/40 font-medium">Mural de Troféus</h2>
                <span className="text-xs font-bold text-white/30">{unlockedTrophies.length}/{TROPHIES.length}</span>
            </div>

            {/* Progress Bar */}
            <div className="mx-2 mb-6 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, type: "spring" }}
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {TROPHIES.map((trophy, index) => {
                    const isUnlocked = unlockedIds.has(trophy.id);
                    const Icon = ICON_MAP[trophy.icon] || TrophyIcon;
                    const isSelected = selectedTrophy === trophy.id;

                    return (
                        <div key={trophy.id} className="relative flex flex-col items-center">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: index * 0.1, type: 'spring' }}
                                onClick={() => setSelectedTrophy(isSelected ? null : trophy.id)}
                                className={`w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all ${
                                    isUnlocked 
                                        ? 'bg-gradient-to-b from-white/10 to-transparent border-white/20 shadow-[0_4px_15px_rgba(255,255,255,0.05)]' 
                                        : 'bg-white/[0.02] border-white/5 opacity-60 grayscale'
                                } ${isSelected ? 'ring-2 ring-offset-2 ring-offset-black ring-white/30 scale-105 z-10' : 'hover:scale-105'}`}
                            >
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner"
                                    style={{ 
                                        backgroundColor: isUnlocked ? `${trophy.color}20` : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${isUnlocked ? trophy.color : 'rgba(255,255,255,0.1)'}`
                                    }}
                                >
                                    {isUnlocked ? (
                                        <Icon size={20} color={trophy.color} className="drop-shadow-lg" />
                                    ) : (
                                        <Lock size={16} className="text-white/20" />
                                    )}
                                </div>
                                <span className={`text-[9px] font-bold text-center leading-tight px-1 ${isUnlocked ? 'text-white/90' : 'text-white/30'}`}>
                                    {trophy.title}
                                </span>
                            </motion.button>

                            {/* Tooltip / Description Popover */}
                            {isSelected && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="absolute top-28 left-1/2 -translate-x-1/2 w-48 bg-[#1a1a1a] border border-white/10 p-3 rounded-xl z-50 shadow-2xl"
                                >
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1a1a1a] border-t border-l border-white/10 rotate-45" />
                                    <h4 className="text-xs font-bold text-white mb-1 relative z-10 flex items-center gap-1.5">
                                        {isUnlocked ? <Icon size={12} color={trophy.color} /> : <Lock size={12} className="text-white/40" />}
                                        {trophy.title}
                                    </h4>
                                    <p className="text-[10px] text-white/50 relative z-10">{trophy.description}</p>
                                    
                                    {!isUnlocked && (
                                        <div className="mt-2 pt-2 border-t border-white/5 relative z-10 text-[9px] text-white/40 font-medium uppercase tracking-widest text-center">
                                            Fechado
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Overlay to close popover when clicking outside */}
            {selectedTrophy && (
                <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setSelectedTrophy(null)}
                />
            )}
        </div>
    );
}
