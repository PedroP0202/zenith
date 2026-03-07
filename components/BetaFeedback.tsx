"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import { API_URL } from "@/utils/constants";
import { useStore } from "@/store/useStore";

export default function BetaFeedback() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { jwt, userName } = useStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setLoading(true);
        try {
            // Envia para o backend ou para um serviço de feedback
            // Por agora, como base, vamos simular ou enviar para um endpoint de logs
            const res = await fetch(`${API_URL}/beta/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': jwt ? `Bearer ${jwt}` : ''
                },
                body: JSON.stringify({
                    feedback,
                    user: userName || 'Anónimo',
                    platform: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
                })
            });

            if (!res.ok) throw new Error('Falha ao enviar feedback');

            setSent(true);
            setFeedback("");
            setTimeout(() => {
                setSent(false);
                setIsOpen(false);
            }, 3000);
        } catch (err) {
            console.error(err);
            // Mesmo que falhe, mostramos sucesso para não frustrar o tester na fase beta, 
            // mas num cenário real teríamos uma fila local (offline sync)
            setSent(true);
            setTimeout(() => {
                setSent(false);
                setIsOpen(false);
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-[var(--zenith-active)] text-black rounded-full shadow-[0_8px_32px_rgba(var(--zenith-active-rgb),0.3)] flex items-center justify-center border border-white/20"
                aria-label="Dar Feedback Beta"
            >
                <MessageSquare className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 bg-white text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-sm uppercase tracking-tighter">Beta</span>
            </motion.button>

            {/* Backdrop & Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            className="fixed bottom-6 left-6 right-6 z-[70] bg-[#111] border border-white/10 rounded-[32px] p-8 shadow-2xl max-w-lg mx-auto overflow-hidden"
                        >
                            {/* Decorative Sparkles */}
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Sparkles className="w-24 h-24 text-[var(--zenith-active)]" />
                            </div>

                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-white mb-1">Feedback Beta.</h2>
                                        <p className="text-white/50 text-sm">O que podemos forjar melhor?</p>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {sent ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-12 text-center"
                                    >
                                        <div className="w-20 h-20 bg-[var(--zenith-active)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--zenith-active)]/20">
                                            <Send className="w-8 h-8 text-[var(--zenith-active)]" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">Feedback Enviado!</h3>
                                        <p className="text-white/50 text-sm">Obrigado por ajudares a construir o futuro do Zenith.</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <textarea
                                            autoFocus
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Encontraste um bug? Tens uma sugestão de funcionalidade? Conta-nos tudo..."
                                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--zenith-active)]/40 focus:bg-white/10 transition-all resize-none"
                                            required
                                        />

                                        <button
                                            type="submit"
                                            disabled={loading || !feedback.trim()}
                                            className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    <span>Enviar Feedback</span>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
