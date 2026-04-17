"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Plus, Users, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";

interface GroupSummary {
    id: string;
    name: string;
    ownerUserId: string;
    createdAt: number;
    memberCount: number;
    habitCount: number;
}

export default function GroupsPage() {
    const router = useRouter();
    const { t } = useTranslation();
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

    const loadGroups = useCallback(async () => {
        if (!jwt) return;
        setGroupsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/groups`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to load groups.");
            setGroups(data.groups || []);
        } catch (err: any) {
            setError(err.message || t.common.error);
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
        setSelectedFriendIds((prev) =>
            prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
        );
    };

    const selectedFriends = useMemo(
        () => friends.filter((friend) => selectedFriendIds.includes(friend.id)),
        [friends, selectedFriendIds]
    );

    const handleCreateGroup = async () => {
        if (!jwt || !groupName.trim()) return;
        setCreating(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_URL}/groups`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: groupName.trim(),
                    memberIds: selectedFriendIds,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to create group.");

            setGroupName("");
            setSelectedFriendIds([]);
            setShowCreate(false);
            setSuccess(t.social.createdGroupSuccess);
            await loadGroups();
            router.push(`/groups/detail?id=${data.groupId}`);
        } catch (err: any) {
            setError(err.message || t.common.error);
        } finally {
            setCreating(false);
        }
    };

    if (!mounted) return null;

    return (
        <main className="min-h-[100dvh] bg-black px-6 pb-24 pt-6 text-white">
            <div className="mx-auto w-full max-w-md">
                <header className="mb-8 flex items-center justify-between gap-4 pt-4">
                    <button
                        onClick={() => router.back()}
                        className="rounded-full bg-white/5 p-3 transition-colors hover:bg-white/10"
                        aria-label="Back"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{t.social.groups}</p>
                        <h1 className="text-2xl font-black tracking-tight">{t.social.groupsTitle}</h1>
                    </div>
                    <button
                        onClick={() => setShowCreate((prev) => !prev)}
                        className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-transform active:scale-95"
                    >
                        {t.social.createGroup}
                    </button>
                </header>

                {showCreate && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"
                    >
                        <div className="mb-4">
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                                {t.social.groupName}
                            </label>
                            <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder={t.social.groupNamePlaceholder}
                                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm outline-none transition-colors focus:border-[var(--zenith-active)]/50"
                            />
                        </div>

                        <div className="mb-4">
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{t.social.addFriends}</p>
                            <div className="space-y-2">
                                {friends.length === 0 ? (
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-5 text-sm text-white/40">
                                        {t.social.emptyFriends}
                                    </div>
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
                                                        ? "border-[var(--zenith-active)]/40 bg-[var(--zenith-active)]/10"
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

                        <button
                            type="button"
                            onClick={handleCreateGroup}
                            disabled={creating || !groupName.trim()}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-transform disabled:opacity-40 active:scale-[0.98]"
                        >
                            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {t.social.createGroup}
                        </button>
                    </motion.section>
                )}

                {error && <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
                {success && <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

                <section className="space-y-4">
                    {groupsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin text-white/30" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] px-6 py-10 text-center">
                            <Users size={32} className="mx-auto mb-4 text-white/20" />
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/40">{t.social.noGroups}</p>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/detail?id=${group.id}`}
                                className="block rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.05]"
                            >
                                <div className="mb-3 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">{t.social.groups}</p>
                                        <h2 className="text-xl font-black tracking-tight">{group.name}</h2>
                                    </div>
                                    <div className="rounded-2xl bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                        {t.social.openGroup}
                                    </div>
                                </div>
                                <div className="flex gap-3 text-[11px] text-white/45">
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
