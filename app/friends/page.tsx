"use client";

import { useStore } from "@/store/useStore";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Search,
    UserPlus,
    Check,
    X,
    Users,
    Loader2,
    Layers3,
    Clock3,
    ArrowUpRight,
    Sparkles,
    RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import Link from "next/link";
import UserOrb from "@/components/UserOrb";
import { FriendRequest, UserSearchResult } from "@/types";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type Tab = "friends" | "requests";

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
}

function FriendsSkeleton() {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <Skeleton className="h-3 w-14 opacity-40" />
                        <Skeleton className="mt-3 h-7 w-9 opacity-50" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-14 w-full rounded-2xl opacity-35" />
            <Skeleton className="h-24 w-full rounded-[2rem] opacity-30" />
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
                    <Skeleton variant="circle" className="h-12 w-12 opacity-40" />
                    <div className="flex-1">
                        <Skeleton className="h-4 w-32 opacity-50" />
                        <Skeleton className="mt-2 h-3 w-20 opacity-30" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function FriendsPage() {
    const {
        jwt,
        friends,
        friendRequests,
        fetchFriends,
        fetchFriendRequests,
        sendFriendRequest,
        handleFriendRequest,
        outgoingRequests,
    } = useStore();
    const { t, language } = useTranslation();
    const router = useRouter();
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [tab, setTab] = useState<Tab>("friends");

    useEffect(() => {
        setMounted(true);
        if (jwt) {
            fetchFriends();
            fetchFriendRequests();
        }
    }, [jwt, fetchFriends, fetchFriendRequests]);

    useEffect(() => {
        if (!feedback) return;
        const timeout = setTimeout(() => setFeedback(null), 2800);
        return () => clearTimeout(timeout);
    }, [feedback]);

    const searchPlaceholder = language === "pt" ? "Procura por @username ou nome" : "Search by @username or name";
    const incomingLabel = language === "pt" ? "Pedidos recebidos" : "Incoming requests";
    const outgoingLabel = language === "pt" ? "Pedidos enviados" : "Outgoing requests";
    const emptyOutgoingLabel = language === "pt" ? "Nenhum pedido enviado" : "No outgoing requests";
    const profileLabel = language === "pt" ? "Perfil" : "Profile";
    const actionsLabel = language === "pt" ? "Ações rápidas" : "Quick actions";
    const retryLabel = language === "pt" ? "Tentar novamente" : "Try again";
    const searchFriendsLabel = language === "pt" ? "Procurar amigos" : "Find friends";
    const addFriendLabel = language === "pt" ? "Adicionar amigo" : "Add friend";
    const emptyFriendsTitle = language === "pt" ? "Constrói a tua rede" : "Build your network";
    const emptyFriendsDescription =
        language === "pt"
            ? "Procura por username ou nome para adicionares pessoas que tornam a jornada mais visível e acompanhada."
            : "Search by username or name to add people who make the journey more visible and accountable.";
    const emptyRequestsDescription =
        language === "pt"
            ? "Quando alguém te enviar um pedido, aparece aqui com ações rápidas para aceitar ou recusar."
            : "When someone sends you a request, it will appear here with quick accept or decline actions.";

    const performSearch = useCallback(async () => {
        if (!jwt || searchQuery.length < 2) {
            setSearchResults([]);
            setSearchError(null);
            return;
        }

        setSearching(true);
        setSearchError(null);
        try {
            const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const data = (await res.json().catch(() => ({}))) as { results?: UserSearchResult[]; error?: string };
            if (!res.ok) throw new Error(data.error || "Search failed.");
            setSearchResults(data.results || []);
        } catch (error: unknown) {
            setSearchResults([]);
            setSearchError(getErrorMessage(error, t.common.error));
        } finally {
            setSearching(false);
        }
    }, [jwt, searchQuery, t.common.error]);

    const focusSearch = () => {
        setTab("friends");
        searchInputRef.current?.focus();
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch();
            } else {
                setSearchResults([]);
                setSearchError(null);
            }
        }, 420);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, performSearch]);

    const onSendRequest = async (friendId: string) => {
        const res = await sendFriendRequest(friendId);
        if (res.success) {
            setFeedback({ type: "success", message: t.social.requestSent });
            setSearchQuery("");
            setSearchResults([]);
            fetchFriendRequests();
            return;
        }
        setFeedback({
            type: "error",
            message: res.error || (language === "pt" ? "Não foi possível enviar o pedido." : "Could not send request."),
        });
    };

    const handleRequest = async (requestId: string, action: "accept" | "reject" | "cancel") => {
        await handleFriendRequest(requestId, action);
        if (action === "accept") {
            setFeedback({ type: "success", message: t.social.accept });
        } else if (action === "reject") {
            setFeedback({ type: "success", message: t.social.decline });
        } else {
            setFeedback({ type: "success", message: language === "pt" ? "Pedido cancelado." : "Request canceled." });
        }
    };

    const totalPendingRequests = friendRequests.length + outgoingRequests.length;
    const incomingRequests: FriendRequest[] = friendRequests;
    const sentRequests: FriendRequest[] = outgoingRequests;

    const tabs = useMemo(
        () => [
            { id: "friends" as Tab, label: t.social.friends, badge: friends.length },
            { id: "requests" as Tab, label: t.social.requests, badge: totalPendingRequests },
        ],
        [friends.length, t.social.friends, t.social.requests, totalPendingRequests]
    );

    if (!mounted) {
        return (
            <main className="mx-auto min-h-[100dvh] max-w-md overflow-x-hidden bg-black p-5 pb-24 pt-20 font-sans text-white sm:px-6">
                <FriendsSkeleton />
            </main>
        );
    }

    return (
        <main className="mx-auto min-h-[100dvh] max-w-md overflow-x-hidden bg-black p-5 pb-24 pt-6 font-sans text-white sm:px-6">
            <header className="mb-6 flex items-center gap-4 pt-4">
                <button
                    onClick={() => router.back()}
                    className="rounded-full border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                    aria-label="Back"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{t.social.title}</p>
                    <h1 className="text-2xl font-black tracking-tight">{t.social.friends}</h1>
                </div>
            </header>

            <section className="mb-6 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{t.social.friends}</p>
                    <p className="mt-2 text-2xl font-black">{friends.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{t.social.requests}</p>
                    <p className="mt-2 text-2xl font-black text-[var(--zenith-active)]">{totalPendingRequests}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{actionsLabel}</p>
                    <p className="mt-2 text-2xl font-black">{outgoingRequests.length}</p>
                </div>
            </section>

            <div className="relative mb-6 group">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/20 transition-colors group-focus-within:text-[var(--zenith-active)]">
                    <Search size={18} />
                </div>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 pl-12 pr-4 font-medium placeholder:text-white/25 focus:border-[var(--zenith-active)]/50 focus:ring-1 focus:ring-[var(--zenith-active)]/20 focus:outline-none"
                />

                <AnimatePresence>
                    {(searching || searchResults.length > 0 || !!searchError || searchQuery.length >= 2) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
                        >
                            {searching ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="animate-spin text-white/25" />
                                </div>
                            ) : searchError ? (
                                <div className="p-4">
                                    <p className="text-xs text-red-200">{searchError}</p>
                                    <button
                                        type="button"
                                        onClick={performSearch}
                                        disabled={searching}
                                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200/20 bg-red-50/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-50 disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className={searching ? "animate-spin" : ""} />
                                        {retryLabel}
                                    </button>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-xs text-white/45">
                                    {language === "pt" ? "Nenhum utilizador encontrado." : "No users found."}
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {searchResults.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-4 transition-colors hover:bg-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">{user.name}</span>
                                                <span className="text-[10px] font-mono text-white/40">@{user.username}</span>
                                            </div>
                                            <button
                                                onClick={() => onSendRequest(user.id)}
                                                aria-label={`${addFriendLabel} ${user.name}`}
                                                className="rounded-xl bg-[var(--zenith-active)] p-2 text-black transition-all hover:scale-105 active:scale-95"
                                            >
                                                <UserPlus size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Link
                href="/groups"
                className="mb-8 block rounded-[2rem] border border-white/12 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 transition-colors hover:bg-white/[0.08]"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">
                            <Layers3 size={14} />
                            {t.social.groups}
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-white">{t.social.groupsTitle}</h2>
                        <p className="mt-1 text-sm text-white/50">{t.social.groupsDesc}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                        <ArrowUpRight size={14} />
                    </div>
                </div>
            </Link>

            {feedback && (
                <div
                    className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                        feedback.type === "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                            : "border-red-500/30 bg-red-500/10 text-red-100"
                    }`}
                >
                    {feedback.message}
                </div>
            )}

            <div className="relative mb-8 flex gap-1 rounded-2xl bg-white/5 p-1.5">
                {tabs.map((tabItem) => (
                    <button
                        key={tabItem.id}
                        onClick={() => setTab(tabItem.id)}
                        className={`relative z-10 flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                            tab === tabItem.id ? "text-black" : "text-white/50 hover:text-white/75"
                        }`}
                    >
                        {tabItem.label}
                        {tabItem.badge > 0 && (
                            <span
                                className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black ${
                                    tab === tabItem.id ? "bg-black/20 text-black" : "bg-[var(--zenith-active)] text-black"
                                }`}
                            >
                                {tabItem.badge}
                            </span>
                        )}
                        {tab === tabItem.id && (
                            <motion.div
                                layoutId="social-active-tab"
                                className="absolute inset-0 -z-10 rounded-xl bg-white"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {tab === "friends" &&
                    (friends.length === 0 ? (
                        <EmptyState
                            icon={<Users size={42} />}
                            title={emptyFriendsTitle}
                            description={emptyFriendsDescription}
                            action={
                                <button
                                    type="button"
                                    onClick={focusSearch}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-transform active:scale-95"
                                >
                                    <Search size={15} />
                                    {searchFriendsLabel}
                                </button>
                            }
                        />
                    ) : (
                        friends.map((friend, index) => (
                            <motion.div
                                key={friend.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.28, delay: index * 0.03 }}
                                className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <UserOrb seed={friend.username} size={48} className="shadow-lg" />
                                    <div className="min-w-0">
                                        <p className="truncate text-lg font-black leading-tight">{friend.name}</p>
                                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                                            @{friend.username} • {friend.score || 0}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={`/friends/profile?u=${friend.username}`}
                                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/75 transition-colors hover:bg-white/10"
                                >
                                    {profileLabel}
                                </Link>
                            </motion.div>
                        ))
                    ))}

                {tab === "requests" && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h2 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{incomingLabel}</h2>
                            {incomingRequests.length === 0 ? (
                                <EmptyState
                                    icon={<Clock3 size={30} />}
                                    title={t.social.emptyRequests}
                                    description={emptyRequestsDescription}
                                    className="px-5 py-9"
                                />
                            ) : (
                                incomingRequests.map((req, i) => (
                                    <motion.div
                                        key={req.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.25, delay: i * 0.03 }}
                                        className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserOrb seed={req.username} size={42} className="shadow-lg" />
                                            <div>
                                                <p className="font-bold leading-tight">{req.name}</p>
                                                <p className="text-[10px] font-mono text-white/40">@{req.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRequest(req.id, "reject")}
                                                aria-label={`${t.social.decline} ${req.name}`}
                                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-white/35 transition-colors hover:bg-red-500/20 hover:text-red-400"
                                            >
                                                <X size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleRequest(req.id, "accept")}
                                                aria-label={`${t.social.accept} ${req.name}`}
                                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--zenith-active)] text-black transition-transform active:scale-95"
                                            >
                                                <Check size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{outgoingLabel}</h2>
                            {sentRequests.length === 0 ? (
                                <EmptyState
                                    icon={<Sparkles size={30} />}
                                    title={emptyOutgoingLabel}
                                    description={language === "pt" ? "Envia um pedido para começares a acompanhar alguém." : "Send a request to start following someone's progress."}
                                    className="px-5 py-9"
                                    action={
                                        <button
                                            type="button"
                                            onClick={focusSearch}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/75 transition-colors hover:bg-white/[0.09]"
                                        >
                                            <Search size={14} />
                                            {searchFriendsLabel}
                                        </button>
                                    }
                                />
                            ) : (
                                sentRequests.map((req, i) => (
                                    <motion.div
                                        key={req.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.25, delay: i * 0.03 }}
                                        className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserOrb seed={req.username} size={42} className="shadow-lg" />
                                            <div>
                                                <p className="font-bold leading-tight">{req.name}</p>
                                                <p className="text-[10px] font-mono text-white/40">@{req.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRequest(req.id, "cancel")}
                                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/60 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                                        >
                                            {language === "pt" ? "Cancelar" : "Cancel"}
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
