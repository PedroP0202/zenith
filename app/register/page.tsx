"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { motion } from "framer-motion";
import { ChevronLeft, Cloud, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { API_URL, GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from "@/utils/constants";
import { Capacitor } from '@capacitor/core';

export default function RegisterPage() {
    const router = useRouter();
    const { setJwt, syncWithCloud, setUserName, clearUserData } = useStore();

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
            const res = await fetch(`${API_URL}/auth/send-code`, {
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
            const res = await fetch(`${API_URL}/auth/register`, {
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

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            await GoogleAuth.initialize({
                clientId: Capacitor.getPlatform() === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_CLIENT_ID,
                scopes: ['profile', 'email']
            });
            const googleUser = await GoogleAuth.signIn();

            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: googleUser.authentication.idToken })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Erro Google.');

            clearUserData();
            setJwt(data.token);
            if (data.user?.name) setUserName(data.user.name);
            syncWithCloud().catch(console.error);
            router.replace('/');
        } catch (err: any) {
            setError('Google Login falhou: ' + (err.message || 'Operação Cancelada.'));
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            const result = await SignInWithApple.authorize({
                clientId: 'com.seusite.zenith',
                redirectURI: 'https://zenith-api.zenith-pedro.workers.dev/auth/apple/callback',
                scopes: 'email name'
            });

            const res = await fetch(`${API_URL}/auth/apple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appleId: result.response.user,
                    email: result.response.email,
                    name: result.response.givenName ? `${result.response.givenName} ${result.response.familyName}` : undefined,
                    identityToken: result.response.identityToken
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Erro Apple.');

            clearUserData();
            setJwt(data.token);
            if (data.user?.name) setUserName(data.user.name);
            syncWithCloud().catch(console.error);
            router.replace('/');
        } catch (err: any) {
            setError('Apple Login falhou: ' + (err.message || 'Operação Cancelada.'));
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
                        <>
                            <div className="pt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => router.push('/login')}
                                    className="text-sm font-medium text-white/50 hover:text-white transition-colors"
                                >
                                    Já tens conta? <span className="text-[var(--zenith-active)] font-bold">Entrar</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-4 my-8">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Ou usa</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={handleAppleLogin}
                                    disabled={loading}
                                    className="w-full h-14 bg-black border border-white/20 text-white font-medium rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-colors active:scale-95 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.328 14.505C14.7 17.593 13.565 18 12.3 18c-1.348 0-2.553-.42-3.23-1.464-.78-1.205-.83-3.15-.09-4.52.41-.75 1.15-1.2 1.89-1.2 1.05 0 1.57.57 2.37.57.8 0 1.57-.6 2.52-.6 1.05 0 1.76.45 2.18 1.06-1.84 1.14-1.52 3.65.18 4.49-.28.82-.57 1.57-.8 2.16zM13.2 10.6c-.19-1.2.78-2.3 1.95-2.5.21 1.3-.87 2.4-1.95 2.5z" />
                                    </svg>
                                    Continuar com Apple
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full h-14 bg-white/5 border border-white/10 text-white font-medium rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continuar com Google
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </motion.div>
        </main>
    );
}
