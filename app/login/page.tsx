"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { motion } from "framer-motion";
import { ChevronLeft, Cloud, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { setJwt, syncWithCloud, clearUserData, setUserName } = useStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // In Production, this will be the Cloudflare Edge URL
            const res = await fetch('https://zenith-api.zenith-pedro.workers.dev/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || 'Erro ao entrar.');

            // Clear local data BEFORE setting JWT to ensure no mixing and fresh restoration
            clearUserData();
            setJwt(data.token);

            // Sync the user name from the database
            if (data.user?.name) {
                setUserName(data.user.name);
            }

            // Sync in the background so it doesn't block the UI transition
            syncWithCloud().catch(console.error);

            // Navigate immediately for that instant premium feel
            router.replace('/');
        } catch (err: any) {
            if (err.message.includes('fetch') || err.message.includes('Network')) {
                setError('Sem ligação ao servidor. Tenta novamente.');
            } else {
                setError(err.message);
            }
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-28 pt-12 font-sans flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-16">
                <button
                    onClick={() => router.push('/settings')}
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
                <h1 className="text-3xl font-black tracking-tight mb-2">Bem-vindo.</h1>
                <p className="text-white/60 text-sm mb-12">Faz login para sincronizar os teus hábitos de forma invisível.</p>

                <form onSubmit={handleLogin} className="space-y-6">
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
                            placeholder="A tua Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                            aria-label={showPassword ? "Esconder Palavra-passe" : "Mostrar Palavra-passe"}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-xl"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="opacity-70">A sintonizar...</span>
                            </>
                        ) : "Entrar e Sincronizar"}
                    </button>

                    <div className="pt-4 text-center">
                        <button
                            type="button"
                            onClick={() => router.push('/register')}
                            className="text-sm font-medium text-white/50 hover:text-white transition-colors"
                        >
                            Ainda não tens conta? <span className="text-[var(--zenith-active)]">Criar</span>
                        </button>
                    </div>
                </form>
            </motion.div>
        </main>
    );
}
