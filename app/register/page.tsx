"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { motion } from "framer-motion";
import { ChevronLeft, Cloud, Loader2, Eye, EyeOff, Check } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const { setJwt, syncWithCloud, setUserName } = useStore();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [code, setCode] = useState("");
    const [step, setStep] = useState<'info' | 'otp'>('info');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [error, setError] = useState("");

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingCode(true);
        setError("");

        // Basic password matching check before sending code
        if (password !== confirmPassword) {
            setError("As palavras-passe não coincidem.");
            setSendingCode(false);
            return;
        }

        const isSecure = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
        if (!isSecure) {
            setError("A password deve ser mais forte (8+ carac, 1 maiúsc, 1 num, 1 símb).");
            setSendingCode(false);
            return;
        }

        try {
            const res = await fetch('https://zenith-api.zenith-pedro.workers.dev/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Erro ao enviar código.');

            if (data.testCode) {
                setCode(data.testCode);
            }

            setStep('otp');
            setSendingCode(false);
        } catch (err: any) {
            setError(err.message);
            setSendingCode(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch('https://zenith-api.zenith-pedro.workers.dev/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, code })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Código incorreto ou erro ao criar conta.');

            setJwt(data.token);
            setUserName(data.user?.name || name || 'User');

            syncWithCloud().catch(console.error);
            router.replace('/');
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
                    aria-label="Back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-[var(--zenith-active)]" />
                    <span className="font-semibold tracking-wide">Zenith Cloud</span>
                </div>
                <div className="w-6" />
            </header>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto"
            >
                <h1 className="text-3xl font-black tracking-tight mb-2">Criar Conta.</h1>
                <p className="text-white/60 text-sm mb-12">Protege o teu progresso na nuvem de forma segura.</p>

                <form onSubmit={step === 'info' ? handleSendCode : handleRegister} className="space-y-6">
                    {step === 'info' ? (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div>
                                <input
                                    type="text"
                                    placeholder="O teu Nome"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                                />
                            </div>
                            <div>
                                <input
                                    type="email"
                                    placeholder="O teu Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Palavra-passe Segura"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--zenith-active)] focus:bg-white/10 transition-all font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[var(--zenith-active)] transition-colors p-1"
                                    aria-label={showPassword ? "Esconder Palavra-passe" : "Mostrar Palavra-passe"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <p className="text-[11px] text-white/40 mt-2 px-2">Mín. 8 caracteres, 1 maiúscula, 1 número, 1 símbolo.</p>
                            </div>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Repetir Palavra-passe"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className={`w-full bg-white/5 border rounded-2xl px-6 py-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 transition-all font-mono ${confirmPassword && password === confirmPassword
                                            ? 'border-green-500/50 focus:border-green-500/70'
                                            : 'border-white/10 focus:border-[var(--zenith-active)]'
                                        }`}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {confirmPassword && password === confirmPassword && (
                                        <Check className="w-5 h-5 text-green-500" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="text-white/40 hover:text-[var(--zenith-active)] transition-colors p-1"
                                        aria-label={showConfirmPassword ? "Esconder Palavra-passe" : "Mostrar Palavra-passe"}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6 text-center"
                        >
                            <p className="text-sm text-white/50 mb-4">Enviámos um código de 6 dígitos para <br /><span className="text-white font-medium">{email}</span></p>
                            <div>
                                <input
                                    type="text"
                                    placeholder="000 000"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    required
                                    autoFocus
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 text-center text-3xl font-bold tracking-[0.5em] text-white placeholder:text-white/10 focus:outline-none focus:border-[var(--zenith-active)] focus:bg-white/10 transition-all"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep('info')}
                                className="text-xs text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest font-bold"
                            >
                                Alterar Email ou Password
                            </button>
                        </motion.div>
                    )}

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-3 rounded-xl px-4"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || sendingCode}
                        className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        {loading || sendingCode ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="opacity-70">{sendingCode ? "A enviar código..." : "A forjar cofre..."}</span>
                            </>
                        ) : (
                            step === 'info' ? "Enviar Código de Verificação" : "Verificar e Criar Conta"
                        )}
                    </button>

                    {step === 'info' && (
                        <div className="pt-4 text-center">
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="text-sm font-medium text-white/50 hover:text-white transition-colors"
                            >
                                Já tens conta? <span className="text-[var(--zenith-active)] font-bold">Entrar</span>
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </main>
    );
}
