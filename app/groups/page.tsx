"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Plus, Users, Check, Layers3, Sparkles, CircleAlert, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
}

interface GroupSummary {
    id: string;
    name: string;
    ownerUserId: string;
    createdAt: number;
    memberCount: number;
    habitCount: number;
}

const GROUP_NAME_MIN = 2;
const GROUP_NAME_MAX = 40;
const GROUP_MEMBERS_MAX = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function GroupsSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <Skeleton className="h-3 w-14 opacity-40" />
                        <Skeleton className="mt-3 h-7 w-10 opacity-50" />
                    </div>
                ))}
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
                    <Skeleton className="h-3 w-24 opacity-35" />
                    <Skeleton className="mt-4 h-7 w-40 opacity-50" />
                    <div className="mt-5 flex gap-3">
                        <Skeleton className="h-3 w-20 opacity-25" />
                        <Skeleton className="h-3 w-20 opacity-25" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function GroupsPage() {
    const router = useRouter();
    const { t, language } = useTranslation();
    const { jwt, friends, fetchFriends } = useStore();
    const [mounted, setMounted] = useState(false);
    const [groups, setGroups] = useState<GroupSummary[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [creatingStateHint, setCreatingStateHint] = useState<string | null>(null);

    const loadGroups = useCallback(async () => {
        if (!jwt) {
            setGroupsLoading(false);
            return;
        }
        setGroupsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/groups`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to load groups.");
            setGroups(data.groups || []);
        } catch (err: unknown) {
            setError(getErrorMessage(err, t.common.error));
        } finally {
            setGroupsLoading(false);
        }
    }, [jwt, t.common.error]);

    useEffect(() => {
        setMounted(true);
        if (jwt) {
            loadGroups();
            fetchFriends();
        }
    }, [jwt, loadGroups, fetchFriends]);

    const toggleFriend = (friendId: string) => {
        if (!selectedFriendIds.includes(friendId) && selectedFriendIds.length >= GROUP_MEMBERS_MAX) {
            setCreatingStateHint(
                language === "pt"
                    ? `Máximo de ${GROUP_MEMBERS_MAX} amigos por grupo.`
                    : `Maximum of ${GROUP_MEMBERS_MAX} friends per group.`
            );
            return;
        }
        setSelectedFriendIds((prev) =>
            prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
        );
        setCreatingStateHint(null);
    };

    const selectedFriends = useMemo(
        () => friends.filter((friend) => selectedFriendIds.includes(friend.id)),
        [friends, selectedFriendIds]
    );

    const sanitizedMemberIds = useMemo(
        () =>
            selectedFriendIds
                .filter((id) => UUID_PATTERN.test(id))
                .slice(0, GROUP_MEMBERS_MAX),
        [selectedFriendIds]
    );

    const hasValidGroupName = useMemo(() => {
        const size = groupName.trim().length;
        return size >= GROUP_NAME_MIN && size <= GROUP_NAME_MAX;
    }, [groupName]);

    const groupOverview = useMemo(() => {
        return {
            groupsCount: groups.length,
            totalMembers: groups.reduce((sum, group) => sum + Number(group.memberCount || 0), 0),
            totalHabits: groups.reduce((sum, group) => sum + Number(group.habitCount || 0), 0),
        };
    }, [groups]);

    const retryLabel = language === "pt" ? "Tentar novamente" : "Try again";
    const networkErrorTitle = language === "pt" ? "Não conseguimos carregar os grupos" : "We could not load groups";
    const groupsEmptyTitle = language === "pt" ? "Cria o primeiro grupo" : "Create your first group";
    const groupsEmptyDescription =
        language === "pt"
            ? "Junta amigos em torno de um objetivo partilhado e acompanha hábitos do grupo num espaço próprio."
            : "Bring friends around a shared goal and track group habits in one dedicated space.";
    const findFriendsLabel = language === "pt" ? "Procurar amigos" : "Find friends";
    const noFriendsDescription =
        language === "pt"
            ? "Adiciona amigos primeiro para poderes convidá-los para este grupo."
            : "Add friends first so you can invite them into this group.";

    const handleCreateGroup = async () => {
        if (!jwt) {
            setError(language === "pt" ? "Sessão expirada. Faz login novamente." : "Session expired. Please sign in again.");
            return;
        }

        const normalizedName = groupName.trim();
        if (normalizedName.length < GROUP_NAME_MIN) {
            setError(
                language === "pt"
                    ? `O nome do grupo precisa de pelo menos ${GROUP_NAME_MIN} caracteres.`
                    : `Group name must have at least ${GROUP_NAME_MIN} characters.`
            );
            return;
        }
        if (normalizedName.length > GROUP_NAME_MAX) {
            setError(
                language === "pt"
                    ? `O nome do grupo pode ter no máximo ${GROUP_NAME_MAX} caracteres.`
                    : `Group name can contain up to ${GROUP_NAME_MAX} characters.`
            );
            return;
        }
        if (selectedFriendIds.length > GROUP_MEMBERS_MAX) {
            setError(
                language === "pt"
                    ? `Só podes convidar até ${GROUP_MEMBERS_MAX} amigos por grupo.`
                    : `You can invite up to ${GROUP_MEMBERS_MAX} friends per group.`
            );
            return;
        }

        if (sanitizedMemberIds.length !== selectedFriendIds.length) {
            setError(
                language === "pt"
                    ? "Existem amigos inválidos na seleção. Atualiza a lista e tenta novamente."
                    : "Some selected friends are invalid. Refresh the list and try again."
            );
            return;
        }

        setCreating(true);
        setError(null);
        setSuccess(null);
        setCreatingStateHint(null);
        try {
            const res = await fetch(`${API_URL}/groups`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: normalizedName,
                    memberIds: sanitizedMemberIds,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to create group.");
            if (!data.groupId || typeof data.groupId !== "string") {
                throw new Error(language === "pt" ? "Grupo criado, mas o identificador não foi devolvido." : "Group created, but its id was not returned.");
            }

            setGroupName("");
            setSelectedFriendIds([]);
            setShowCreate(false);
            setSuccess(t.social.createdGroupSuccess);
            await loadGroups();
            router.push(`/groups/detail?id=${data.groupId}`);
        } catch (err: unknown) {
            setError(getErrorMessage(err, t.common.error));
        } finally {
            setCreating(false);
        }
    };

    if (!mounted) {
        return (
            <main className="min-h-[100dvh] bg-black px-5 pb-24 pt-6 text-white sm:px-6">
                <div className="mx-auto w-full max-w-md pt-20">
                    <GroupsSkeleton />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[100dvh] bg-black px-5 pb-24 pt-6 text-white sm:px-6">
            <div className="mx-auto w-full max-w-md">
                <header className="mb-6 flex items-center justify-between gap-4 pt-4">
                    <button
                        onClick={() => router.back()}
                        className="rounded-full border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                        aria-label="Back"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{t.social.groups}</p>
                        <h1 className="text-2xl font-black tracking-tight text-white">{t.social.groupsTitle}</h1>
                    </div>
                    <button
                        onClick={() => setShowCreate((prev) => !prev)}
                        className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-transform active:scale-95"
                    >
                        {t.social.createGroup}
                    </button>
                </header>

                <section className="mb-6 grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{t.social.groups}</p>
                        <p className="mt-2 text-2xl font-black">{groupOverview.groupsCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{t.social.groupMembers}</p>
                        <p className="mt-2 text-2xl font-black">{groupOverview.totalMembers}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{t.social.groupHabits}</p>
                        <p className="mt-2 text-2xl font-black">{groupOverview.totalHabits}</p>
                    </div>
                </section>

                {showCreate && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 rounded-[2rem] border border-white/12 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5"
                    >
                        <div className="mb-5">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={14} className="text-[var(--zenith-active)]" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">
                                        {t.social.createGroup}
                                    </p>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                                    {groupName.trim().length}/{GROUP_NAME_MAX}
                                </p>
                            </div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                {t.social.groupName}
                            </label>
                            <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder={t.social.groupNamePlaceholder}
                                maxLength={GROUP_NAME_MAX}
                                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm outline-none transition-colors focus:border-[var(--zenith-active)]/50"
                            />
                        </div>

                        <div className="mb-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{t.social.addFriends}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                                    {selectedFriendIds.length}/{GROUP_MEMBERS_MAX}
                                </p>
                            </div>
                            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                {friends.length === 0 ? (
                                    <EmptyState
                                        icon={<Users size={28} />}
                                        title={t.social.emptyFriends}
                                        description={noFriendsDescription}
                                        className="rounded-2xl px-4 py-6"
                                        action={
                                            <Link
                                                href="/friends"
                                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-black transition-transform active:scale-95"
                                            >
                                                <Users size={14} />
                                                {findFriendsLabel}
                                            </Link>
                                        }
                                    />
                                ) : (
                                    friends.map((friend) => {
                                        const selected = selectedFriendIds.includes(friend.id);
                                        return (
                                            <button
                                                key={friend.id}
                                                type="button"
                                                onClick={() => toggleFriend(friend.id)}
                                                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                                                    selected
                                                        ? "border-[var(--zenith-active)]/45 bg-[var(--zenith-active)]/10"
                                                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-bold">{friend.name}</div>
                                                    <div className="text-[11px] text-white/40">@{friend.username}</div>
                                                </div>
                                                <div className={`rounded-xl p-2 ${selected ? "bg-[var(--zenith-active)] text-black" : "bg-white/5 text-white/30"}`}>
                                                    {selected ? <Check size={16} /> : <Users size={16} />}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {selectedFriends.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {selectedFriends.map((friend) => (
                                    <span key={friend.id} className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/70">
                                        @{friend.username}
                                    </span>
                                ))}
                            </div>
                        )}

                        {creatingStateHint && (
                            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
                                <CircleAlert size={14} className="shrink-0" />
                                <span>{creatingStateHint}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleCreateGroup}
                            disabled={creating || !hasValidGroupName}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-transform disabled:opacity-40 active:scale-[0.98]"
                        >
                            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {t.social.createGroup}
                        </button>
                    </motion.section>
                )}

                {error && (
                    <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-bold">{networkErrorTitle}</p>
                                <p className="mt-1 text-xs text-red-100/70">{error}</p>
                            </div>
                            <button
                                type="button"
                                onClick={loadGroups}
                                disabled={groupsLoading}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200/20 bg-red-50/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-50 transition-colors hover:bg-red-50/15 disabled:opacity-50"
                            >
                                <RefreshCw size={13} className={groupsLoading ? "animate-spin" : ""} />
                                {retryLabel}
                            </button>
                        </div>
                    </div>
                )}
                {success && <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

                <section className="space-y-4">
                    {groupsLoading ? (
                        <GroupsSkeleton />
                    ) : groups.length === 0 ? (
                        <EmptyState
                            icon={<Layers3 size={34} />}
                            title={groupsEmptyTitle}
                            description={groupsEmptyDescription}
                            action={
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(true)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-transform active:scale-95"
                                >
                                    <Plus size={15} />
                                    {t.social.createGroup}
                                </button>
                            }
                        />
                    ) : (
                        groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/detail?id=${group.id}`}
                                className="block rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 transition-colors hover:bg-white/[0.07]"
                            >
                                <div className="mb-3 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">
                                            <Layers3 size={12} />
                                            {t.social.groups}
                                        </p>
                                        <h2 className="text-xl font-black tracking-tight">{group.name}</h2>
                                    </div>
                                    <div className="rounded-2xl bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                        {t.social.openGroup}
                                    </div>
                                </div>
                                <div className="flex gap-3 text-[11px] text-white/50">
                                    <span>{group.memberCount} {t.social.groupMembers.toLowerCase()}</span>
                                    <span>{group.habitCount} {t.social.groupHabits.toLowerCase()}</span>
                                </div>
                            </Link>
                        ))
                    )}
                </section>
            </div>
        </main>
    );
}
