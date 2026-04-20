"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Check, Loader2, Plus, Users, Sparkles, CircleCheckBig } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { API_URL } from "@/utils/constants";

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
}

interface GroupMember {
    id: string;
    name: string;
    username: string;
    role: "owner" | "member";
}

interface GroupHabit {
    id: string;
    title: string;
    frequency: number[];
    createdAt: number;
    myCompletedToday: boolean;
    completedTodayCount: number;
    participantsToday: Array<{ id: string; name: string; username: string }>;
}

interface GroupPayload {
    group: { id: string; name: string; ownerUserId: string; createdAt: number };
    membership: { role: "owner" | "member"; owner_user_id: string };
    members: GroupMember[];
    habits: GroupHabit[];
}

function GroupDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const groupId = searchParams.get("id");
    const { t, language } = useTranslation();
    const { jwt, friends, fetchFriends } = useStore();
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<GroupPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [inviteId, setInviteId] = useState("");
    const [inviting, setInviting] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState("");
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [creatingHabit, setCreatingHabit] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const notFoundLabel = language === "pt" ? "Grupo não encontrado." : "Group not found.";

    const loadGroup = useCallback(async () => {
        if (!jwt) {
            setLoading(false);
            return;
        }
        if (!groupId) {
            setError(notFoundLabel);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to load group.");
            setData(body);
        } catch (err: unknown) {
            setError(getErrorMessage(err, t.common.error));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [groupId, jwt, notFoundLabel, t.common.error]);

    useEffect(() => {
        setMounted(true);
        if (jwt) {
            loadGroup();
            fetchFriends();
        } else {
            setLoading(false);
        }
    }, [fetchFriends, jwt, loadGroup]);

    const availableFriends = useMemo(() => {
        const memberIds = new Set(data?.members.map((member) => member.id) || []);
        return friends.filter((friend) => !memberIds.has(friend.id));
    }, [friends, data]);

    const groupInsights = useMemo(() => {
        if (!data) {
            return { totalChecks: 0, maxChecks: 0, completionPct: 0 };
        }
        const totalChecks = data.habits.reduce((sum, habit) => sum + habit.completedTodayCount, 0);
        const maxChecks = data.habits.length * Math.max(data.members.length, 1);
        const completionPct = maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0;
        return { totalChecks, maxChecks, completionPct };
    }, [data]);

    const handleInvite = async () => {
        if (!jwt || !groupId || !inviteId) return;
        setInviting(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_URL}/groups/${groupId}/members`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ friendId: inviteId }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to invite friend.");
            setInviteId("");
            setSuccess(t.social.addedMemberSuccess);
            await loadGroup();
        } catch (err: unknown) {
            setError(getErrorMessage(err, t.common.error));
        } finally {
            setInviting(false);
        }
    };

    const handleCreateHabit = async () => {
        if (!jwt || !groupId || !newHabitTitle.trim() || selectedDays.length === 0) return;
        setCreatingHabit(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_URL}/groups/${groupId}/habits`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: newHabitTitle.trim(),
                    frequency: selectedDays,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to create habit.");
            setNewHabitTitle("");
            setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
            setSuccess(t.social.createdGroupHabitSuccess);
            await loadGroup();
        } catch (err: unknown) {
            setError(getErrorMessage(err, t.common.error));
        } finally {
            setCreatingHabit(false);
        }
    };

    const handleToggleHabit = async (habitId: string) => {
        if (!jwt || !groupId) return;
        setTogglingId(habitId);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/groups/${groupId}/habits/${habitId}/toggle`, {
                method: "POST",
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to toggle habit.");
            await loadGroup();
        } catch (err: unknown) {
            setError(getErrorMessage(err, t.common.error));
        } finally {
            setTogglingId(null);
        }
    };

    const toggleDay = (dayIndex: number) => {
        setSelectedDays((prev) =>
            prev.includes(dayIndex) ? prev.filter((day) => day !== dayIndex) : [...prev, dayIndex].sort((a, b) => a - b)
        );
    };

    if (!mounted) return null;

    return (
        <main className="min-h-[100dvh] bg-black px-5 pb-24 pt-6 text-white sm:px-6">
            <div className="mx-auto w-full max-w-md">
                <header className="mb-6 flex items-center gap-4 pt-4">
                    <button
                        onClick={() => router.back()}
                        className="rounded-full border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                        aria-label="Back"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">{t.social.groups}</p>
                        <h1 className="text-2xl font-black tracking-tight">{data?.group.name || "..."}</h1>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-white/30" />
                    </div>
                ) : error ? (
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-200">{error}</div>
                        <Link
                            href="/groups"
                            className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70"
                        >
                            {language === "pt" ? "Voltar para grupos" : "Back to groups"}
                        </Link>
                    </div>
                ) : !data ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/40">{notFoundLabel}</div>
                ) : (
                    <div className="space-y-6">
                        <section className="grid grid-cols-3 gap-2.5">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">{t.social.groupMembers}</p>
                                <p className="mt-2 text-2xl font-black">{data.members.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">{t.social.groupHabits}</p>
                                <p className="mt-2 text-2xl font-black">{data.habits.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">{t.social.todayProgress}</p>
                                <p className="mt-2 text-2xl font-black text-[var(--zenith-active)]">{groupInsights.completionPct}%</p>
                            </div>
                        </section>

                        {success && (
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                                {success}
                            </div>
                        )}

                        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">{t.social.groupMembers}</p>
                                    <h2 className="text-lg font-black">{data.members.length} {t.social.groupMembers.toLowerCase()}</h2>
                                </div>
                            </div>

                            <div className="mb-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                                {data.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                        <div>
                                            <div className="font-bold">{member.name}</div>
                                            <div className="text-[11px] text-white/45">@{member.username}</div>
                                        </div>
                                        <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/65">
                                            {member.role}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {data.membership.role === "owner" && (
                                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="mb-2 flex items-center gap-2">
                                        <Sparkles size={13} className="text-[var(--zenith-active)]" />
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                            {t.social.inviteFriend}
                                        </label>
                                    </div>
                                    {availableFriends.length > 0 ? (
                                        <div className="flex gap-2">
                                            <select
                                                value={inviteId}
                                                onChange={(e) => setInviteId(e.target.value)}
                                                className="flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none"
                                            >
                                                <option value="">{t.social.addFriends}</option>
                                                {availableFriends.map((friend) => (
                                                    <option key={friend.id} value={friend.id}>
                                                        {friend.name} (@{friend.username})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleInvite}
                                                disabled={!inviteId || inviting}
                                                className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-black disabled:opacity-40"
                                            >
                                                {inviting ? <Loader2 size={16} className="animate-spin" /> : t.social.inviteFriend}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-white/45">{t.social.emptyFriends}</p>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--zenith-active)]">{t.social.createGroupHabit}</p>
                            <input
                                value={newHabitTitle}
                                onChange={(e) => setNewHabitTitle(e.target.value)}
                                placeholder={t.social.groupHabitPlaceholder}
                                maxLength={80}
                                className="mb-4 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition-colors focus:border-[var(--zenith-active)]/50"
                            />
                            <div className="mb-4 flex justify-between gap-2">
                                {t.habit.daysOfWeek.map((label, index) => {
                                    const selected = selectedDays.includes(index);
                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => toggleDay(index)}
                                            className={`h-10 w-10 rounded-full text-sm font-black transition-all ${
                                                selected ? "bg-white text-black" : "bg-white/5 text-white/35"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={handleCreateHabit}
                                disabled={creatingHabit || !newHabitTitle.trim() || selectedDays.length === 0}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-40"
                            >
                                {creatingHabit ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                {t.social.createGroupHabit}
                            </button>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{t.social.groupHabits}</p>
                                    <h2 className="text-xl font-black">{t.social.completeTogether}</h2>
                                </div>
                            </div>

                            {data.habits.length === 0 ? (
                                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                                    <Users size={28} className="mx-auto mb-4 text-white/20" />
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/40">{t.social.createGroupHabit}</p>
                                </div>
                            ) : (
                                data.habits.map((habit) => {
                                    const denominator = Math.max(data.members.length, 1);
                                    const progressPercent = Math.round((habit.completedTodayCount / denominator) * 100);

                                    return (
                                        <motion.div
                                            key={habit.id}
                                            layout
                                            className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5"
                                        >
                                            <div className="mb-4 flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-lg font-black">{habit.title}</h3>
                                                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/35">
                                                        {habit.completedTodayCount}/{data.members.length} {t.social.todayProgress.toLowerCase()}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleHabit(habit.id)}
                                                    disabled={togglingId === habit.id}
                                                    className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                                                        habit.myCompletedToday
                                                            ? "bg-[var(--zenith-active)] text-black"
                                                            : "bg-white/8 text-white/75"
                                                    }`}
                                                >
                                                    {togglingId === habit.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : habit.myCompletedToday ? (
                                                        <CircleCheckBig size={16} />
                                                    ) : (
                                                        t.social.todayProgress
                                                    )}
                                                </button>
                                            </div>

                                            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/8">
                                                <div
                                                    className="h-full rounded-full bg-[var(--zenith-active)] transition-[width] duration-500"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>

                                            <div className="mb-4 flex gap-2">
                                                {t.habit.daysOfWeek.map((label, index) => (
                                                    <span
                                                        key={index}
                                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black ${
                                                            habit.frequency.includes(index) ? "bg-white text-black" : "bg-white/5 text-white/25"
                                                        }`}
                                                    >
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {habit.participantsToday.length === 0 ? (
                                                    <span className="text-xs text-white/35">{t.social.todayProgress}: 0</span>
                                                ) : (
                                                    habit.participantsToday.map((participant) => (
                                                        <span
                                                            key={participant.id}
                                                            className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/70"
                                                        >
                                                            @{participant.username}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function GroupDetailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
                    <Loader2 className="animate-spin text-white/30" />
                </div>
            }
        >
            <GroupDetailContent />
        </Suspense>
    );
}
