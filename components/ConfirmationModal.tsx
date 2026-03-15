"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { deviceHaptics } from "../utils/haptics";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    children?: React.ReactNode;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "",
    cancelLabel = "",
    isDanger = true,
    children,
}: ConfirmationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-[#0A0A0A] border border-white/10 rounded-[32px] p-8 text-center shadow-2xl overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className={`absolute -top-20 -left-20 w-40 h-40 ${isDanger ? 'bg-red-500/10' : 'bg-white/5'} blur-[60px] rounded-full`} />

                        <div className="relative z-10">
                            <div className={`w-16 h-16 ${isDanger ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'} rounded-2xl flex items-center justify-center mx-auto mb-6 border`}>
                                <AlertTriangle className={`w-8 h-8 ${isDanger ? 'text-red-500' : 'text-white/60'}`} />
                            </div>

                            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">{title}</h2>

                            <p className="text-white/50 text-sm leading-relaxed mb-8">
                                {description}
                            </p>

                            {children}

                            <div className="flex flex-col gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        if (isDanger) {
                                            deviceHaptics.heavyImpact();
                                        } else {
                                            deviceHaptics.mediumImpact();
                                        }
                                        onConfirm();
                                    }}
                                    className={`w-full h-14 ${isDanger ? 'bg-red-500 text-white' : 'bg-white text-black'} font-bold rounded-2xl transition-transform active:scale-95 shadow-lg`}
                                >
                                    {confirmLabel}
                                </button>

                                <button
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        onClose();
                                    }}
                                    className="w-full h-14 bg-white/5 text-white/70 font-bold rounded-2xl transition-all hover:bg-white/10 active:scale-95"
                                >
                                    {cancelLabel}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
