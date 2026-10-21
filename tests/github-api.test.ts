import { describe, expect, it, vi } from 'vitest';
import { fetchPublicRepository } from '../scripts/github-api.mjs';

describe('GitHub snapshot API', () => {
  it('uses an abort timeout and includes the rate-limit reset in API errors', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => {
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      return new Response('', { status: 403, headers: { 'x-ratelimit-reset': '1760000000' } });
    });
    await expect(fetchPublicRepository('agent-memory', fetcher)).rejects.toThrow('rate limit resets at 2025-10-09T08:53:20.000Z');
    expect(timeout).toHaveBeenCalledWith(15_000);
    timeout.mockRestore();
  });
  it('rejects a repository unless GitHub confirms it is public', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ private: true }), { status: 200 }));
    await expect(fetchPublicRepository('agent-memory', fetcher)).rejects.toThrow('is not public');
  });
});
