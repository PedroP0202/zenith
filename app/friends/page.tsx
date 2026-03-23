"use client";

import { useStore } from "@/store/useStore";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, UserPlus, Check, X, Users, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import ComparisonModal from "@/components/ComparisonModal";

export default function FriendsPage() {
    const { 
        jwt, 
        friends, 
        friendRequests, 
        friendsLoading, 
        fetchFriends, 
        fetchFriendRequests, 
        sendFriendRequest, 
        handleFriendRequest 
    } = useStore();
    const { t } = useTranslation();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [tab, setTab] = useState<'friends' | 'requests'>('friends');
    const [selectedFriend, setSelectedFriend] = useState<{username: string, name: string} | null>(null);

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

            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
                <button 
                    onClick={() => setTab('friends')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'friends' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
                >
                    {t.social.friends}
                </button>
                <button 
                    onClick={() => setTab('requests')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${tab === 'requests' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
                >
                    {t.social.requests}
                    {friendRequests.length > 0 && (
                        <span className={`absolute top-2 right-4 w-1.5 h-1.5 rounded-full ${tab === 'requests' ? 'bg-red-500' : 'bg-[var(--zenith-active)] shadow-[0_0_8px_var(--zenith-active)]'}`} />
                    )}
                </button>
            </div>

            {/* Content List */}
            <div className="space-y-4">
                {tab === 'friends' ? (
                    friends.length === 0 ? (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                            <Users size={48} />
                            <p className="text-sm font-bold uppercase tracking-widest">{t.social.emptyFriends}</p>
                        </div>
                    ) : (
                        friends.map((friend) => (
                            <motion.div 
                                key={friend.id}
                                layout
                                className="p-5 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-white/20 uppercase">
                                        {friend.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg">{friend.name}</span>
                                        <div className="flex items-center gap-1.5">
                                            <Zap size={10} className="text-[var(--zenith-active)]" />
                                            <span className="text-[10px] text-white/40 font-black uppercase tracking-tighter">{friend.score} Focos</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedFriend({username: friend.username, name: friend.name})}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all active:scale-95"
                                >
                                    {t.social.compare}
                                </button>
                            </motion.div>
                        ))
                    )
                ) : (
                    friendRequests.length === 0 ? (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                            <Zap size={48} />
                            <p className="text-sm font-bold uppercase tracking-widest">{t.social.emptyRequests}</p>
                        </div>
                    ) : (
                        friendRequests.map((req) => (
                            <motion.div 
                                key={req.id}
                                layout
                                className="p-5 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">{req.name}</span>
                                    <span className="text-[10px] text-white/40 font-mono">@{req.username}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleFriendRequest(req.id, 'reject')}
                                        className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 text-white/20 hover:text-red-500 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleFriendRequest(req.id, 'accept')}
                                        className="p-3 bg-[var(--zenith-active)] text-black rounded-xl shadow-glow-active active:scale-95 transition-all"
                                    >
                                        <Check size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )
                )}
            </div>

            <ComparisonModal 
                isOpen={!!selectedFriend}
                onClose={() => setSelectedFriend(null)}
                friendUsername={selectedFriend?.username || ""}
                friendName={selectedFriend?.name || ""}
            />
        </main>
    );
}
