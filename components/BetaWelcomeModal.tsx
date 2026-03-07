"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, Cloud, ArrowRight, X } from "lucide-react";

export default function BetaWelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Mostra o modal apenas uma vez por sessão ou baseado em localstorage
        const hasSeenWelcome = localStorage.getItem("zenith_beta_welcome_seen");
        if (!hasSeenWelcome) {
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("zenith_beta_welcome_seen", "true");
        setIsOpen(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-gradient-to-b from-[#111] to-black border border-white/10 rounded-[40px] p-10 text-center shadow-2xl overflow-hidden"
                    >
                        {/* Abstract Background Glow */}
                        <div className="absolute -top-20 -left-20 w-40 h-40 bg-[var(--zenith-active)]/20 blur-[80px] rounded-full" />

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 rotate-3">
                                <Sparkles className="w-10 h-10 text-[var(--zenith-active)]" />
                            </div>

                            <h2 className="text-3xl font-black tracking-tighter text-white mb-4">Bem-vindo ao Beta.</h2>

                            <p className="text-white/60 text-sm leading-relaxed mb-8">
                                Estás entre os primeiros a testar o **Zenith**. O nosso objetivo é ajudar-te a forjar disciplina inquebrável.
                            </p>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    </div>
                                    <span className="text-xs text-white/70">Testa a sincronização na nuvem</span>
                                </div>
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-6 h-6 rounded-full bg-[var(--zenith-active)]/10 flex items-center justify-center flex-shrink-0">
                                        <Cloud className="w-4 h-4 text-[var(--zenith-active)]" />
                                    </div>
                                    <span className="text-xs text-white/70">Usa os botões de Login Social</span>
                                </div>
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <ArrowRight className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span className="text-xs text-white/70">Partilha sugestões no botão flutuante</span>
                                </div>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full h-14 bg-white text-black font-bold rounded-2xl transition-transform active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            >
                                Começar Exploração
                            </button>

                            <p className="mt-6 text-[10px] text-white/20 uppercase tracking-widest font-bold">Zenith v4.2 Early Access</p>
                        </div>

                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
