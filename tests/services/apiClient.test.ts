import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from '@/services/apiClient';

const fetchMock = vi.mocked(fetch);

describe('apiClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('adds auth headers and serializes JSON bodies', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(apiClient.post('/sync/push', { habits: [] }, { authToken: 'token-123', retries: 0 })).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledWith('https://zenith-api.zenith-pedro.workers.dev/sync/push', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ habits: [] }),
    }));
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('normalizes API error responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(apiClient.get('/friends', { retries: 0 })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Token inválido',
    } satisfies Partial<ApiError>);
  });

  it('retries retryable failures once by default', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'busy' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(apiClient.get('/leaderboard')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
