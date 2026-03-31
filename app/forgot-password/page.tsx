"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Cloud, Loader2, Eye, EyeOff, Check, Send } from "lucide-react";
import { API_URL } from "@/utils/constants";
import { deviceHaptics } from "@/utils/haptics";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [hp, setHp] = useState(""); // Honeypot

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, hp })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Erro ao enviar código.');

            if (data.testCode) {
                setCode(data.testCode); // For local testing
            }

            deviceHaptics.success();
            setStep('reset');
        } catch (err: any) {
            deviceHaptics.error();
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (newPassword !== confirmPassword) {
            setError("As palavras-passe não coincidem.");
            deviceHaptics.error();
            setLoading(false);
            return;
        }

        const isSecure = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
        if (!isSecure) {
            setError("A palavra-passe deve ser mais forte (8+ carac, 1 maiúsc, 1 num, 1 símb).");
            deviceHaptics.error();
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Código incorreto ou erro.');

            deviceHaptics.success();
            setSuccessMsg("Palavra-passe alterada com sucesso!");
            setTimeout(() => {
                router.replace('/login');
            }, 2000);
        } catch (err: any) {
            deviceHaptics.error();
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white px-6 sm:px-8 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] font-sans flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-12 sm:mb-16">
                <button
                    onClick={() => router.push('/login')}
                    className="p-3 -ml-3 text-white/40 hover:text-white transition-colors"
                    aria-label="Back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <Logo className="text-xl text-white" />
                <div className="w-6" />
            </header>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto w-full flex-1"
            >
                <div className="mb-12">
                    <h1 className="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                        Recupera o Acesso.
                    </h1>
                    <p className="text-white/40 text-sm font-medium">Forja uma nova chave de entrada na tua conta.</p>
                </div>

                <AnimatePresence mode="wait">
                    {successMsg ? (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            className="flex flex-col items-center justify-center p-10 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-glow-primary"
                        >
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-white mb-2">Concluído.</h2>
                            <p className="text-white/40 text-center text-sm font-medium">{successMsg}</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={step === 'email' ? handleSendCode : handleResetPassword} className="space-y-6">
                            {step === 'email' ? (
                                <motion.div 
                                    key="email-step"
                                    initial={{ opacity: 0, x: -20 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <div style={{ display: 'none' }}>
                                        <input
                                            type="text"
                                            value={hp}
                                            onChange={(e) => setHp(e.target.value)}
                                            tabIndex={-1}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            placeholder="O teu Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--zenith-active)]/50 focus:bg-white/[0.05] transition-all font-medium"
                                        />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="reset-step"
                                    initial={{ opacity: 0, x: 20 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 ml-2 font-black">Código de 6 Dígitos</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="000 000"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            required
                                            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-6 text-center text-4xl font-black tracking-[0.5em] text-[var(--zenith-active)] placeholder:text-white/5 focus:outline-none focus:border-[var(--zenith-active)] transition-all font-mono"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Nova Palavra-passe"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 pr-14 text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--zenith-active)]/50 focus:bg-white/[0.05] transition-all font-mono"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirmar Repetição"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className={`w-full bg-white/[0.03] backdrop-blur-md border rounded-2xl px-6 py-5 pr-14 text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.05] transition-all font-mono ${confirmPassword && newPassword === confirmPassword ? 'border-green-500/50 focus:border-green-500/70' : 'border-white/10 focus:border-[var(--zenith-active)]/50'}`}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </form>
                    )}
                </AnimatePresence>

                {!successMsg && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8 space-y-4"
                    >
                        {error && (
                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs text-center font-bold tracking-tight bg-red-400/10 py-4 rounded-2xl border border-red-400/20 px-4">
                                {error}
                            </motion.p>
                        )}

                        <button
                            onClick={step === 'email' ? (e: any) => handleSendCode(e) : (e: any) => handleResetPassword(e)}
                            disabled={loading}
                            className="w-full h-16 bg-[var(--zenith-active)] text-black font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-glow-primary hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] group"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span>{step === 'email' ? "Enviar Código" : "Redefinir Acesso"}</span>
                                    {step === 'email' ? <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> : <Check className="w-6 h-6" />}
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-4 text-xs font-bold text-white/20 hover:text-white/40 transition-colors uppercase tracking-[0.2em]"
                        >
                            Cancelar
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </main>
    );
}
