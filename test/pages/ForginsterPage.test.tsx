import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { md5 } from 'js-md5';
import ForginsterPage from '@/pages/ForginsterPage';
import { endpoints } from '@/config/api';

const mocks = vi.hoisted(() => ({ refetch: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('@/hooks', () => ({
  useI18n: () => ({ i18n: (key: string) => key.split('.').at(-1), isReady: true }),
  useUserContext: () => ({ refetch: mocks.refetch }),
}));
vi.mock('@/components', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('react-toastify', () => ({ toast: mocks }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Location() { return <output>{useLocation().pathname + useLocation().search}</output>; }
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  window.turnstile = {
    render: (element: HTMLElement) => {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = 'cf-turnstile-response'; input.value = 'captcha-token';
      element.appendChild(input);
      return 'widget';
    },
    remove: vi.fn(),
  };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); delete window.turnstile;
});
async function render(path: string) {
  await act(async () => root.render(<MemoryRouter initialEntries={[path]}><ForginsterPage /><Location /></MemoryRouter>));
}
function field(name: string) { return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!; }
function fill(name: string, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field(name), value);
    field(name).dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function sendCode() {
  await act(async () => container.querySelector<HTMLButtonElement>('form button[type="button"]')!.click());
}
async function submit() {
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
function body(index: number) { return fetchMock.mock.calls[index][1].body as FormData; }
function submitButton() { return container.querySelector<HTMLButtonElement>('button[type="submit"]')!; }

describe('email challenge authentication', () => {
  it('requests a registration challenge, submits its key/code and nickname, then returns to login', async () => {
    fetchMock.mockResolvedValueOnce(new Response('secret-key')).mockResolvedValueOnce(Response.json({ username: 'player' }));
    await render('/register?redirect=%2Fqrauth%3Fauth-id%3Dabc');
    expect(submitButton().disabled).toBe(true);
    fill('email', 'player+test@example.com'); await sendCode();
    expect(fetchMock.mock.calls[0][0]).toBe(endpoints.account.emailChallenge);
    expect(body(0).get('email')).toBe('player+test@example.com');
    fill('username', 'player'); fill('nickname', 'Player One'); fill('password', 'secret'); fill('password2', 'secret'); fill('challengeCode', '12345678');
    await submit();
    expect(fetchMock.mock.calls[1][0]).toBe(endpoints.account.register);
    expect(Object.fromEntries(body(1))).toEqual({ username: 'player', nickname: 'Player One', email: 'player+test@example.com', password: md5('secret'), challengeKey: 'secret-key', challengeCode: '12345678', 'cf-turnstile-response': 'captcha-token' });
    expect(container.querySelector('output')!.textContent).toBe('/login?redirect=%2Fqrauth%3Fauth-id%3Dabc');
  });

  it('resets with email in the request query and newPassword in the confirm form', async () => {
    fetchMock.mockResolvedValueOnce(Response.json('reset-key')).mockResolvedValueOnce(new Response(null, { status: 200 }));
    await render('/forget');
    expect(field('username')).toBeNull();
    fill('email', 'player+test@example.com'); await sendCode();
    expect(fetchMock.mock.calls[0][0]).toBe('/api3/api/account/password-reset/request?email=player%2Btest%40example.com');
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    fill('challengeCode', '12345678'); fill('password', 'new-secret'); fill('password2', 'new-secret'); await submit();
    expect(fetchMock.mock.calls[1][0]).toBe(endpoints.account.passwordResetConfirm);
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(Object.fromEntries(body(1))).toEqual({ email: 'player+test@example.com', newPassword: md5('new-secret'), challengeCode: '12345678', challengeKey: 'reset-key' });
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(container.querySelector('output')!.textContent).toBe('/login');
  });

  it('invalidates the challenge when the email changes', async () => {
    fetchMock.mockResolvedValueOnce(new Response('key'));
    await render('/register'); fill('email', 'one@example.com'); await sendCode();
    expect(submitButton().disabled).toBe(false);
    fill('challengeCode', '12345678'); fill('email', 'two@example.com');
    expect(submitButton().disabled).toBe(true); expect(field('challengeCode').value).toBe('');
    await submit(); expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('expires codes after five minutes and supports resending', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response('old-key')).mockResolvedValueOnce(new Response('new-key'));
    await render('/forget'); fill('email', 'one@example.com'); await sendCode();
    await act(async () => { vi.advanceTimersByTime(5 * 60_000); });
    expect(submitButton().disabled).toBe(true); expect(container.textContent).toContain('CodeExpired');
    await sendCode(); expect(submitButton().disabled).toBe(false);
    fill('password', 'x'); fill('password2', 'y'); await submit();
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(mocks.error).toHaveBeenCalledWith('PasswdNoMatch');
  });

  it('requires a fresh challenge after registration validation consumes it', async () => {
    fetchMock.mockResolvedValueOnce(new Response('key')).mockResolvedValueOnce(Response.json({ code: 4, message: 'Username exists' }, { status: 400 }));
    await render('/register'); fill('email', 'one@example.com'); await sendCode();
    fill('username', 'player'); fill('nickname', 'player'); fill('password', 'x'); fill('password2', 'x'); fill('challengeCode', '12345678'); await submit();
    expect(mocks.error).toHaveBeenCalledWith('UsernameExists'); expect(submitButton().disabled).toBe(true);
    expect(field('challengeCode').value).toBe('');
  });

  it('handles throttling and network errors without getting stuck', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response('', { status: 429 }));
    await render('/forget'); fill('email', 'one@example.com'); await sendCode();
    expect(mocks.error).toHaveBeenCalledWith('NetworkError');
    expect(container.querySelector<HTMLFieldSetElement>('fieldset')!.disabled).toBe(false);
    await sendCode(); expect(mocks.error).toHaveBeenCalledWith('TooManyRequests');
    expect(container.querySelector<HTMLButtonElement>('form button[type="button"]')!.disabled).toBe(true);
  });

  it('does not submit an old activation link to a removed endpoint', async () => {
    await render('/login?otp=old-key');
    expect(container.textContent).toContain('LegacyLink'); expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs in with an email and retains rememberMe and the internal redirect', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: 114514 }));
    await render('/login?redirect=%2Fuser%2Fprofile'); fill('username', 'one@example.com'); fill('password', 'secret');
    act(() => field('rememberMe').click()); await submit();
    expect(Object.fromEntries(body(0))).toEqual({ username: 'one@example.com', password: md5('secret'), rememberMe: 'true' });
    expect(mocks.refetch).toHaveBeenCalledOnce(); expect(container.querySelector('output')!.textContent).toBe('/user/profile');
  });

  it('shows login errors without reading the response body twice', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: -114514, message: 'Service unavailable' }, { status: 500 }));
    await render('/login'); fill('username', 'player'); fill('password', 'secret'); await submit();
    expect(mocks.error).toHaveBeenCalledWith('Service unavailable');
    expect(container.querySelector<HTMLFieldSetElement>('fieldset')!.disabled).toBe(false);
  });
});
