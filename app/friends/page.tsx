"use client";

import { useStore } from "@/store/useStore";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, UserPlus, Check, X, Users, Zap, Loader2, Layers3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import Link from "next/link";
import UserOrb from "@/components/UserOrb";

type Tab = 'friends' | 'requests';

export default function FriendsPage() {
    const { 
        jwt, 
        friends, 
        friendRequests, 
        friendsLoading, 
        fetchFriends, 
        fetchFriendRequests, 
        sendFriendRequest, 
        handleFriendRequest,
        removeFriend,
        outgoingRequests
    } = useStore();
    const { t } = useTranslation();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [tab, setTab] = useState<Tab>('friends');

    useEffect(() => {
        setMounted(true);
        if (jwt) {
            fetchFriends();
            fetchFriendRequests();
        }
    }, [jwt, fetchFriends, fetchFriendRequests]);

    const performSearch = useCallback(async () => {
        setSearching(true);
        try {
            const res = await fetch(`${API_URL}/users/search?q=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSearchResults(data.results || []);
            }
        } catch (e) {
            console.error("Search failed:", e);
        } finally {
            setSearching(false);
        }
    }, [jwt, searchQuery]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, performSearch]);

    const onSendRequest = async (friendId: string) => {
        const res = await sendFriendRequest(friendId);
        if (res.success) {
            setSearchQuery("");
            setSearchResults([]);
        }
    };

    if (!mounted) return null;

    const tabs: { id: Tab; label: string; badge?: number }[] = [
        { id: 'friends', label: t.social.friends, badge: friends.length },
        { 
            id: 'requests', 
            label: t.social.requests, 
            badge: friendRequests.length + outgoingRequests.length 
        },
    ];

    return (
        <main className="min-h-screen bg-black text-white p-6 pb-24 font-sans max-w-md mx-auto relative overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center gap-4 mb-8 pt-4">
                <button 
                    onClick={() => router.back()}
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-black tracking-tight">{t.social.title}</h1>
            </header>

            {/* Search Bar */}
            <div className="relative mb-8 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-[var(--zenith-active)] transition-colors">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    placeholder={t.social.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[var(--zenith-active)]/50 focus:ring-1 focus:ring-[var(--zenith-active)]/20 transition-all font-medium placeholder:text-white/20"
                />
                
                {/* Search Results Dropdown */}
                <AnimatePresence>
                    {(searching || searchResults.length > 0) && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5"
                        >
                            {searching ? (
                                <div className="p-8 flex justify-center">
                                    <Loader2 className="animate-spin text-white/20" />
                                </div>
                            ) : searchResults.map((user) => (
                                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{user.name}</span>
                                        <span className="text-[10px] text-white/40 font-mono">@{user.username}</span>
                                    </div>
                                    <button 
                                        onClick={() => onSendRequest(user.id)}
                                        className="p-2 bg-[var(--zenith-active)] text-black rounded-lg hover:scale-105 active:scale-95 transition-all shadow-glow-active"
                                    >
                                        <UserPlus size={16} />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Link
                href="/groups"
                className="mb-8 block rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 hover:bg-white/[0.08] transition-colors"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">
                            <Layers3 size={14} />
                            {t.social.groups}
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-white">{t.social.groupsTitle}</h2>
                        <p className="mt-1 text-sm text-white/45">{t.social.groupsDesc}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                        {t.social.openGroup}
                    </div>
                </div>
            </Link>

            {/* Tabs */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl mb-8 relative gap-1">
                {tabs.map((tabItem) => (
                    <button 
                        key={tabItem.id}
                        onClick={() => setTab(tabItem.id)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10 ${tab === tabItem.id ? 'text-black' : 'text-white/40 hover:text-white/60'}`}
                    >
                        {tabItem.label}
                        {/* Badge dot */}
                        {tabItem.badge !== undefined && tabItem.badge > 0 && (
                            <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center ${
                                tab === tabItem.id 
                                    ? 'bg-black/20 text-black' 
                                    : 'bg-[var(--zenith-active)] text-black'
                            }`}>
                                {tabItem.badge}
                            </span>
                        )}
                        {tab === tabItem.id && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-0 bg-white rounded-xl -z-10 shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="space-y-4">
                {/* ── FRIENDS TAB ── */}
                {tab === 'friends' && (
                    friends.length === 0 ? (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                            <Users size={48} />
                            <p className="text-sm font-bold uppercase tracking-widest">{t.social.emptyFriends}</p>
                        </div>
                    ) : (
                        friends.map((friend, i) => (
                            <motion.div 
                                key={friend.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="p-4 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.06] transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <UserOrb seed={friend.username} size={48} className="shadow-lg group-hover:scale-105 transition-transform" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg leading-tight">{friend.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Zap size={10} className="text-[var(--zenith-active)]" />
                                            <span className="text-[10px] text-white/40 font-black uppercase tracking-tighter">{friend.score || 0} Hábitos</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link 
                                        href={`/friends/profile?u=${friend.username}`}
                                        className="h-10 px-6 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all active:scale-95 flex items-center justify-center relative z-10"
                                    >
                                        Perfil
                                    </Link>
                                </div>
                            </motion.div>
                        ))
                    )
                )}

                {/* ── REQUESTS TAB ── */}
                {tab === 'requests' && (
                    <div className="space-y-8">
                        {/* Incoming Requests */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-2">Pedidos de Amizade</h2>
                            {friendRequests.length === 0 ? (
                                <div className="text-center py-10 opacity-20 flex flex-col items-center gap-3">
                                    <Zap size={32} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">{t.social.emptyRequests}</p>
                                </div>
                            ) : (
                                friendRequests.map((req, i) => (
                                    <motion.div 
                                        key={req.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: i * 0.05 }}
                                        className="p-4 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserOrb seed={req.username} size={40} className="shadow-lg" />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base leading-tight">{req.name}</span>
                                                <span className="text-[10px] text-white/40 font-mono">@{req.username}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleFriendRequest(req.id, 'reject')}
                                                className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-2xl hover:bg-red-500/20 text-white/20 hover:text-red-500 transition-all"
                                            >
                                                <X size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleFriendRequest(req.id, 'accept')}
                                                className="h-10 w-10 flex items-center justify-center bg-[var(--zenith-active)] text-black rounded-2xl shadow-glow-active active:scale-95 transition-all"
                                            >
                                                <Check size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Outgoing Requests */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-2">Pedidos Enviados</h2>
                            {outgoingRequests.length === 0 ? (
                                <div className="text-center py-10 opacity-20 flex flex-col items-center gap-3">
                                    <UserPlus size={32} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum pedido enviado</p>
                                </div>
                            ) : (
                                outgoingRequests.map((req, i) => (
                                    <motion.div 
                                        key={req.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: i * 0.05 }}
                                        className="p-4 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserOrb seed={req.username} size={40} className="shadow-lg" />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base leading-tight">{req.name}</span>
                                                <span className="text-[10px] text-white/40 font-mono">@{req.username}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleFriendRequest(req.id, 'cancel')}
                                            className="h-10 px-4 bg-white/5 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-500 transition-all border border-white/5 hover:border-red-500/20"
                                        >
                                            Cancelar
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
