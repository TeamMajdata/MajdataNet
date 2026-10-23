import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/utils/apiClient';

afterEach(() => vi.unstubAllGlobals());

describe('backend response formats', () => {
  it.each([
    ['raw challenge key', 'challenge-key', 'challenge-key'],
    ['JSON challenge key', '"challenge-key"', 'challenge-key'],
    ['empty success', '', ''],
  ])('accepts %s', async (_, body, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    expect(await apiRequest('/api')).toBe(expected);
  });

  it('preserves the backend code and message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 10, message: 'Invalid code' }, { status: 400 })));
    await expect(apiRequest('/api')).rejects.toMatchObject({ status: 400, code: 10, message: 'Invalid code' });
  });

  it('handles a proxy HTML error without displaying markup', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><title>Service unavailable</title></html>', { status: 502 })));
    await expect(apiRequest('/api')).rejects.toMatchObject({ status: 502, message: 'Service unavailable' });
  });
});
