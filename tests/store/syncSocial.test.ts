import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/store/useStore';

vi.mock('@/utils/widgetSync', () => ({
  syncWidgetData: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/utils/notifications', () => ({
  scheduleAllNotifications: vi.fn(() => Promise.resolve()),
  cancelAllNotifications: vi.fn(() => Promise.resolve()),
}));

const fetchMock = vi.mocked(fetch);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useStore cloud sync and social flows', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useStore.getState().logout();
    useStore.setState({
      jwt: 'test-token',
      userName: 'Pedro',
      username: 'pedro',
      language: 'pt',
      optInLeaderboard: true,
      lastLoginRewardDate: '2026-05-04',
    });
  });

  it('pulls server state, pushes unsynced habits and applies server-authoritative XP', async () => {
    useStore.setState({ jwt: null });
    useStore.getState().addHabit({
      title: 'Read',
      frequency: [1, 2, 3, 4, 5],
      scheduleType: 'specific_days',
      goalType: 'complete',
      isHardMode: false,
    });
    const habitId = useStore.getState().habits[0].id;
    useStore.getState().toggleHabitLog(habitId, new Date('2026-05-05T10:00:00Z').getTime());
    useStore.setState({ jwt: 'test-token' });

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({
        habits: [],
        logs: [],
        timestamp: 123,
        user: {
          total_xp: 120,
          level: 2,
          arena_points: 50,
          lastLoginRewardDate: '2026-05-05',
        },
      }))
      .mockResolvedValueOnce(jsonResponse({ success: true, timestamp: 456 }));

    await useStore.getState().syncWithCloud();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/sync/pull?lastSyncedAt=0');
    expect(fetchMock.mock.calls[2][0]).toContain('/sync/push');
    expect(useStore.getState()).toMatchObject({
      totalXP: 120,
      level: 2,
      arenaPoints: 50,
      lastLoginRewardDate: '2026-05-05',
      syncStatus: 'idle',
      deletedHabitIds: [],
      deletedLogIds: [],
    });
  });

  it('marks sync errors without losing local data', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    useStore.setState({ jwt: null });
    useStore.getState().addHabit({
      title: 'Meditate',
      frequency: [1],
      scheduleType: 'specific_days',
      goalType: 'complete',
      isHardMode: false,
    });
    useStore.setState({ jwt: 'test-token' });
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ error: 'Pull failed' }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: 'Pull failed' }, 500));

    await useStore.getState().syncWithCloud();

    expect(useStore.getState().syncStatus).toBe('error');
    expect(useStore.getState().habits).toHaveLength(1);
    consoleError.mockRestore();
  });

  it('fetches friends and friend requests through authenticated endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ friends: [{ id: 'friend-1', name: 'Ana', username: 'ana', score: 3 }] }))
      .mockResolvedValueOnce(jsonResponse({
        incoming: [{ id: 'request-1', from_id: 'user-2', name: 'Luis', username: 'luis', created_at: 1 }],
        outgoing: [{ id: 'request-2', to_id: 'user-3', name: 'Mia', username: 'mia', created_at: 2 }],
      }));

    await useStore.getState().fetchFriends();
    await useStore.getState().fetchFriendRequests();

    expect(useStore.getState().friends).toHaveLength(1);
    expect(useStore.getState().friendRequests).toHaveLength(1);
    expect(useStore.getState().outgoingRequests).toHaveLength(1);
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('returns normalized social errors to the caller', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Já existe um pedido.' }, 400));

    await expect(useStore.getState().sendFriendRequest('friend-1')).resolves.toEqual({
      success: false,
      error: 'Já existe um pedido.',
    });
  });
});
