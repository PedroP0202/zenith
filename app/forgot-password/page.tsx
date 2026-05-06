"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Eye, EyeOff, Check, Send } from "lucide-react";
import { API_URL } from "@/utils/constants";
import { deviceHaptics } from "@/utils/haptics";
import Logo from "@/components/Logo";
import { AppButton, AppInput } from "@/components/ui";

function getErrorMessage(error: unknown, fallback = "Erro inesperado."): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    if (typeof error === "object" && error !== null && "message" in error) {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === "string" && maybeMessage) return maybeMessage;
    }
    return fallback;
}

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

    const sendCode = async () => {
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
        } catch (err: unknown) {
            deviceHaptics.error();
            setError(getErrorMessage(err, "Erro ao enviar código."));
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
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
        } catch (err: unknown) {
            deviceHaptics.error();
            setError(getErrorMessage(err, "Código incorreto ou erro."));
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (step === 'email') {
            void sendCode();
            return;
        }
        void resetPassword();
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
                    <h1 className="mb-2 text-3xl font-semibold text-white">
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
                            className="flex flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-10"
                        >
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10">
                                <Check className="h-7 w-7 text-green-400" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-white">Concluído.</h2>
                            <p className="text-white/40 text-center text-sm font-medium">{successMsg}</p>
                        </motion.div>
                    ) : (
                        <form id="forgot-form" onSubmit={handleSubmit} className="space-y-6">
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
                                            aria-hidden="true"
                                            value={hp}
                                            onChange={(e) => setHp(e.target.value)}
                                            tabIndex={-1}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <AppInput
                                        id="forgot-email"
                                        label="Email"
                                        type="email"
                                        placeholder="nome@exemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
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
                                        <AppInput
                                            id="forgot-code"
                                            label="Código de 6 dígitos"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="000 000"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            required
                                            inputClassName="py-5 text-center text-3xl font-semibold tracking-[0.42em] text-white font-mono"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <AppInput
                                            id="forgot-new-password"
                                            label="Nova palavra-passe"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Nova palavra-passe"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                            inputClassName="font-mono"
                                            trailing={(
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/60 transition-colors" aria-label={showPassword ? "Esconder Palavra-passe" : "Mostrar Palavra-passe"}>
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            )}
                                        />
                                    </div>
                                    <div className="relative group">
                                        <AppInput
                                            id="forgot-confirm-password"
                                            label="Confirmar palavra-passe"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirmar repetição"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                            inputClassName={`font-mono ${confirmPassword && newPassword === confirmPassword ? 'border-green-500/50 focus:border-green-500/70' : ''}`}
                                            trailing={(
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-white/30 hover:text-white/60 transition-colors" aria-label={showConfirmPassword ? "Esconder Palavra-passe" : "Mostrar Palavra-passe"}>
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            )}
                                        />
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
                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-xs font-medium text-red-300">
                                {error}
                            </motion.p>
                        )}

                        <AppButton
                            type="submit"
                            form="forgot-form"
                            disabled={loading}
                            fullWidth
                            className="h-12"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span>{step === 'email' ? "Enviar Código" : "Redefinir Acesso"}</span>
                                    {step === 'email' ? <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> : <Check className="w-6 h-6" />}
                                </>
                            )}
                        </AppButton>

                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-4 text-xs font-medium uppercase tracking-[0.14em] text-white/24 transition-colors hover:text-white/45"
                        >
                            Cancelar
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </main>
    );
}
