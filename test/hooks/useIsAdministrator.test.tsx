import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsAdministrator } from '@/hooks/useIsAdministrator';

let currentUser: { id: string; username: string } | null = { id: 'u1', username: 'alice' };
vi.mock('@/hooks/useUserContext', () => ({
  useUserContext: () => ({ user: currentUser, username: currentUser?.username ?? '', isLoading: false, error: null, refetch: () => {} }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  return <output>{String(useIsAdministrator())}</output>;
}

describe('useIsAdministrator', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    currentUser = { id: 'u1', username: 'alice' };
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  const render = () => act(async () => root.render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}><Probe /></SWRConfig>,
  ));

  it('is true when the admin group listing answers', async () => {
    fetchMock.mockResolvedValue(Response.json(['administrator', 'eventManager']));
    await render();
    expect(fetchMock.mock.calls[0][0]).toBe('/api3/api/admin/groups');
    expect(container.textContent).toBe('true');
  });

  it('is false for an account outside the group', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    await render();
    expect(container.textContent).toBe('false');
  });

  it('asks nothing while signed out', async () => {
    currentUser = null;
    await render();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe('false');
  });
});
