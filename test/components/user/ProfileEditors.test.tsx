import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AvatarUploader from '@/components/user/AvatarUploader';
import IntroUploader from '@/components/user/IntroUploader';
import NicknameEditor from '@/components/user/NicknameEditor';

const mocks = vi.hoisted(() => ({ post: vi.fn(), refetch: vi.fn(), error: vi.fn(), success: vi.fn(), loading: vi.fn(), done: vi.fn() }));
vi.mock('axios', () => ({ default: { post: mocks.post } }));
vi.mock('react-toastify', () => ({ toast: mocks }));
vi.mock('@/components', () => ({ LoadingSpinner: () => <span>Loading</span> }));
vi.mock('@/hooks', () => ({
  useI18n: () => ({ i18n: (key: string) => key.split('.').at(-1) }),
  useUserContext: () => ({ user: { username: 'player', nickname: 'Player One', avatarId: 'new-avatar-id' }, refetch: mocks.refetch }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks(); mocks.post.mockResolvedValue({ data: { username: 'player', introduction: 'Updated' } });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it('uploads the avatar field to profile and refreshes the avatar identifier', async () => {
  await act(async () => root.render(<AvatarUploader />));
  expect(container.querySelector('img')!.getAttribute('src')).toBe('/api3/api/avatar/new-avatar-id');
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File(['image'], 'avatar.png', { type: 'image/png' });
  Object.defineProperty(input, 'files', { value: [file] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  const upload = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Upload')!;
  await act(async () => upload.click());
  expect(mocks.post.mock.calls[0][0]).toBe('/api3/api/account/profile');
  const form = mocks.post.mock.calls[0][1] as FormData;
  expect(form.get('avatar')).toBe(file); expect(form.has('pic')).toBe(false);
  expect(mocks.refetch).toHaveBeenCalledOnce();
});

it('reads profile and saves introduction using the new multipart field', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ username: 'player', introduction: 'Hello' })));
  vi.stubGlobal('fetch', fetch);
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}><IntroUploader /></SWRConfig>));
  expect(fetch.mock.calls[0][0]).toBe('/api3/api/account/profile?username=player');
  const textarea = container.querySelector('textarea')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Updated');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mocks.post.mock.calls[0][0]).toBe('/api3/api/account/profile');
  const form = mocks.post.mock.calls[0][1] as FormData;
  expect(form.get('introduction')).toBe('Updated'); expect(form.has('content')).toBe(false);
  expect(mocks.refetch).toHaveBeenCalledOnce();
});

it('updates the nickname without sending unrelated profile fields', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ username: 'player', nickname: 'Player Two' })); vi.stubGlobal('fetch', fetch);
  await act(async () => root.render(<NicknameEditor />));
  const input = container.querySelector('input')!;
  act(() => { input.value = 'Player Two'; });
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(fetch.mock.calls[0][0]).toBe('/api3/api/account/profile');
  expect(Object.fromEntries(fetch.mock.calls[0][1].body)).toEqual({ nickname: 'Player Two' });
  expect(mocks.refetch).toHaveBeenCalledOnce();
});
