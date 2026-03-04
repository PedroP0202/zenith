"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Cloud, Loader2, Eye, EyeOff, Check } from "lucide-react";

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

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch('https://zenith-api.dronee.blog/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Erro ao enviar código.');

            if (data.testCode) {
                setCode(data.testCode); // For local testing
            }

            setStep('reset');
        } catch (err: any) {
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
            setLoading(false);
            return;
        }

        const isSecure = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
        if (!isSecure) {
            setError("A palavra-passe deve ser mais forte (8+ carac, 1 maiúsc, 1 num, 1 símb).");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('https://zenith-api.dronee.blog/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Código incorreto ou erro.');

            setSuccessMsg("Palavra-passe alterada com sucesso!");
            setTimeout(() => {
                router.replace('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-28 pt-12 font-sans flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-16">
                <button
                    onClick={() => router.push('/login')}
                    className="p-3 -ml-3 text-white/60 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-[var(--zenith-active)]" />
                    <span className="font-semibold tracking-wide">Recuperação Zenith</span>
                </div>
                <div className="w-6" />
            </header>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto w-full"
            >
                <h1 className="text-3xl font-black tracking-tight mb-2">Quase Lado a Lado.</h1>
                <p className="text-white/60 text-sm mb-12">Recupera o acesso à tua conta de forma segura.</p>

                {successMsg ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-8 bg-green-500/10 border border-green-500/20 rounded-3xl">
                        <Check className="w-12 h-12 text-green-500 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Sucesso</h2>
                        <p className="text-white/60 text-center text-sm">{successMsg}</p>
                    </motion.div>
                ) : (
                    <form onSubmit={step === 'email' ? handleSendCode : handleResetPassword} className="space-y-6">
                        {step === 'email' ? (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="O teu Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-white/40 mb-2 ml-2 font-bold">Código de 6 Dígitos</label>
                                    <input
                                        type="text"
                                        placeholder="000 000"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 text-center text-3xl font-bold tracking-[0.5em] text-white placeholder:text-white/10 focus:outline-none focus:border-[var(--zenith-active)] focus:bg-white/10 transition-all font-mono"
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Nova Palavra-passe"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--zenith-active)] focus:bg-white/10 transition-all font-mono"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Repetir Nova Palavra-passe"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className={`w-full bg-white/5 border rounded-2xl px-6 py-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 transition-all font-mono ${confirmPassword && newPassword === confirmPassword ? 'border-green-500/50 focus:border-green-500/70' : 'border-white/10 focus:border-[var(--zenith-active)]'}`}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {error && (
                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-3 rounded-xl">
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-[var(--zenith-active)] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (step === 'email' ? "Recuperar" : "Redefinir Palavra-passe")}
                        </button>
                    </form>
                )}
            </motion.div>
        </main>
    );
}
