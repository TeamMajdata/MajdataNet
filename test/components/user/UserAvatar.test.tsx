import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserAvatar from '@/components/user/UserAvatar';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('UserAvatar', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render(children: ReactNode) {
    await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>));
  }
  const sources = () => [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));
  const requested = () => fetchMock.mock.calls.map(([url]) => String(url));

  it('uses a known avatar id without looking up the profile', async () => {
    await render(<UserAvatar username="player" avatarId="abc" />);
    expect(sources()).toEqual(['/api3/api/avatar/abc']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves the avatar id from the public profile when only the username is known', async () => {
    fetchMock.mockImplementation(async () => Response.json({ username: 'a b', avatarId: 'id-1' }));
    await render(<UserAvatar username="a b" />);
    expect(requested()).toEqual(['/api3/api/account/profile?username=a%20b']);
    expect(sources()).toEqual(['/api3/api/avatar/id-1']);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('a b');
  });

  it('looks up a username once however many avatars show it', async () => {
    fetchMock.mockImplementation(async () => Response.json({ username: 'bob', avatarId: 'id-bob' }));
    await render(<><UserAvatar username="bob" /><UserAvatar username="bob" /></>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sources()).toEqual(['/api3/api/avatar/id-bob', '/api3/api/avatar/id-bob']);
  });

  it('keeps a same-sized placeholder instead of flashing the default avatar while looking up', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    await render(<UserAvatar username="slow" className="w-6 h-6 rounded-full" />);
    expect(container.querySelector('img')).toBeNull();
    const placeholder = container.querySelector('[data-testid="avatar-placeholder"]');
    expect(placeholder?.className).toBe('w-6 h-6 rounded-full');
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back to the default avatar when the user does not exist', async () => {
    fetchMock.mockImplementation(async () => Response.json({ code: 40400, message: 'No such user' }, { status: 404 }));
    await render(<UserAvatar username="ghost" />);
    expect(sources()).toEqual(['/api3/api/avatar/default']);
  });

  it('falls back to the default avatar when the profile has no avatar id', async () => {
    fetchMock.mockImplementation(async () => Response.json({ username: 'plain' }));
    await render(<UserAvatar username="plain" />);
    expect(sources()).toEqual(['/api3/api/avatar/default']);
  });

  it('shows the default avatar without a request when there is no username', async () => {
    await render(<UserAvatar username="" />);
    expect(sources()).toEqual(['/api3/api/avatar/default']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
