"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Cloud, Loader2, ShieldAlert, CheckCircle2, MessageSquare, Clock } from "lucide-react";
import { API_URL } from "@/utils/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type Feedback = {
    id: string;
    user_name: string;
    platform: string;
    content: string;
    status: 'unread' | 'read' | 'resolved';
    created_at: number;
};

export default function AdminPage() {
    const router = useRouter();
    const [secret, setSecret] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/admin/feedbacks`, {
                headers: { 'Authorization': `Bearer ${secret}` }
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Acesso negado.');

            setFeedbacks(data.feedbacks || []);
            setIsAuthenticated(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus as any } : f));

            await fetch(`${API_URL}/admin/feedbacks/${id}/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secret}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (!isAuthenticated) {
        return (
            <main className="min-h-[100dvh] bg-black text-white p-6 font-sans flex flex-col items-center justify-center">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-center mb-2">Comando Central</h1>
                    <p className="text-white/40 text-center text-sm mb-8">Acesso restrito ao criador do Zenith.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            placeholder="Chave Mestra"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all font-mono tracking-widest"
                            required
                        />
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Desbloquear"}
                        </button>
                    </form>
                    <button onClick={() => router.push('/')} className="w-full mt-6 text-xs text-white/30 hover:text-white/60 uppercase tracking-widest font-bold">Voltar</button>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-28 pt-12 font-sans flex flex-col max-w-4xl mx-auto">
            <header className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="p-3 -ml-3 bg-white/5 rounded-full text-white/60 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Feedbacks</h1>
                        <p className="text-white/50 text-xs">Visão Global do Zenith</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--zenith-active)]/10 border border-[var(--zenith-active)]/20 rounded-full">
                    <Cloud className="w-4 h-4 text-[var(--zenith-active)]" />
                    <span className="text-xs font-bold text-[var(--zenith-active)]">Ligado</span>
                </div>
            </header>

            {feedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                    <p>Nenhum feedback recebido ainda.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {feedbacks.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-[24px] border transition-colors ${item.status === 'unread' ? 'bg-white/10 border-white/20' :
                                item.status === 'resolved' ? 'bg-green-500/5 border-green-500/20 opacity-60' :
                                    'bg-white/5 border-white/5'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{item.user_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/50 truncate max-w-[150px]">
                                            {item.platform}
                                        </span>
                                        <div className="flex items-center text-[10px] text-white/40">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {format(item.created_at, "dd MMM, HH:mm", { locale: pt })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {item.status !== 'resolved' && (
                                        <button
                                            onClick={() => updateStatus(item.id, 'resolved')}
                                            className="p-2 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500/20 transition-colors"
                                            title="Marcar como Resolvido"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-white/80 leading-relaxed bg-black/50 p-4 rounded-xl border border-white/5">
                                &quot;{item.content}&quot;
                            </p>
                        </motion.div>
                    ))}
                </div>
            )}
        </main>
    );
}
