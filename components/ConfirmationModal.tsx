"use client";

import { useEffect, type ReactNode } from "react";
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
    confirmDisabled?: boolean;
    children?: ReactNode;
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
    confirmDisabled = false,
    children,
}: ConfirmationModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

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
                        initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(8px)' }}
                        transition={{ duration: 0.35, type: 'spring', damping: 25, stiffness: 300 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirmation-modal-title"
                        aria-describedby="confirmation-modal-description"
                        className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0A0A0A] p-7 text-center shadow-2xl sm:p-8"
                    >
                        <div className={`absolute -top-20 -left-20 w-40 h-40 ${isDanger ? 'bg-red-500/10' : 'bg-white/5'} blur-[60px] rounded-full`} />

                        <div className="relative z-10">
                            <div className={`w-16 h-16 ${isDanger ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'} rounded-2xl flex items-center justify-center mx-auto mb-6 border`}>
                                <AlertTriangle className={`w-8 h-8 ${isDanger ? 'text-red-500' : 'text-white/60'}`} />
                            </div>

                            <h2 id="confirmation-modal-title" className="mb-3 text-2xl font-bold tracking-tight text-white">{title}</h2>

                            <p id="confirmation-modal-description" className="mb-8 text-sm leading-relaxed text-white/50">
                                {description}
                            </p>

                            {children}

                            <div className="flex flex-col gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        if (confirmDisabled) return;
                                        if (isDanger) {
                                            deviceHaptics.heavyImpact();
                                        } else {
                                            deviceHaptics.mediumImpact();
                                        }
                                        onConfirm();
                                    }}
                                    disabled={confirmDisabled}
                                    className={`h-14 w-full rounded-2xl font-bold shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${isDanger ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
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
                            className="absolute right-4 top-4 p-2 text-white/20 transition-colors hover:text-white"
                            aria-label={cancelLabel || "Close"}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
