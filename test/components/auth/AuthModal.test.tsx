import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { md5 } from 'js-md5';
import AuthModal from '@/components/auth/AuthModal';
import { endpoints } from '@/config/api';
import i18n from '@/i18n';
import { isAuthPath } from '@/utils/authPaths';

const mocks = vi.hoisted(() => ({ refetch: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('@/hooks', () => ({
  useUserContext: () => ({ refetch: mocks.refetch }),
}));
vi.mock('@/components', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('react-toastify', () => ({ toast: mocks }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function AuthModalRoute() { return isAuthPath(useLocation().pathname) ? <AuthModal /> : null; }
function Location() { return <output>{useLocation().pathname + useLocation().search}</output>; }
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

// 这里测的是登录路由和表单，不是动画；而且有用例把假时钟拨快了五分钟，
// framer-motion 沿用那个时间戳后，之后用例里的关闭动画迟迟播不完。直接跳过动画。
beforeAll(() => { MotionGlobalConfig.skipAnimations = true; });
afterAll(() => { MotionGlobalConfig.skipAnimations = false; });

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
  await act(async () => root.render(<MemoryRouter initialEntries={[path]}><AuthModalRoute /><Location /></MemoryRouter>));
}
// 弹窗通过 portal 渲染在 body 下，查询都在 document.body 里做
function field(name: string) { return document.body.querySelector<HTMLInputElement>(`input[name="${name}"]`)!; }
function fill(name: string, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field(name), value);
    field(name).dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function sendCode() {
  await act(async () => document.body.querySelector<HTMLButtonElement>('form button[type="button"]')!.click());
}
async function submit() {
  await act(async () => document.body.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
function body(index: number) { return fetchMock.mock.calls[index][1].body as FormData; }
function submitButton() { return document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!; }

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
    expect(document.body.querySelector('output')!.textContent).toBe('/login?redirect=%2Fqrauth%3Fauth-id%3Dabc');
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
    expect(document.body.querySelector('output')!.textContent).toBe('/login');
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
    expect(submitButton().disabled).toBe(true); expect(document.body.textContent).toContain(i18n.t('auth/AuthModal.CodeExpired'));
    await sendCode(); expect(submitButton().disabled).toBe(false);
    fill('password', 'x'); fill('password2', 'y'); await submit();
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(mocks.error).toHaveBeenCalledWith(i18n.t('auth/AuthModal.PasswdNoMatch'));
  });

  it('requires a fresh challenge after registration validation consumes it', async () => {
    fetchMock.mockResolvedValueOnce(new Response('key')).mockResolvedValueOnce(Response.json({ code: 60103, message: 'Username exists' }, { status: 400 }));
    await render('/register'); fill('email', 'one@example.com'); await sendCode();
    fill('username', 'player'); fill('nickname', 'player'); fill('password', 'x'); fill('password2', 'x'); fill('challengeCode', '12345678'); await submit();
    expect(mocks.error).toHaveBeenCalledWith(i18n.t('auth/AuthModal.UsernameExists')); expect(submitButton().disabled).toBe(true);
    expect(field('challengeCode').value).toBe('');
  });

  it('handles throttling and network errors without getting stuck', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response('', { status: 429 }));
    await render('/forget'); fill('email', 'one@example.com'); await sendCode();
    expect(mocks.error).toHaveBeenCalledWith(i18n.t('auth/AuthModal.NetworkError'));
    expect(document.body.querySelector<HTMLFieldSetElement>('fieldset')!.disabled).toBe(false);
    await sendCode(); expect(mocks.error).toHaveBeenCalledWith(i18n.t('auth/AuthModal.TooManyRequests'));
    expect(document.body.querySelector<HTMLButtonElement>('form button[type="button"]')!.disabled).toBe(true);
  });

  it('does not submit an old activation link to a removed endpoint', async () => {
    await render('/login?otp=old-key');
    expect(document.body.textContent).toContain(i18n.t('auth/AuthModal.LegacyLink')); expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs in with an email and retains rememberMe and the internal redirect', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: 114514 }));
    await render('/login?redirect=%2Fuser%2Fprofile'); fill('username', 'one@example.com'); fill('password', 'secret');
    act(() => field('rememberMe').click()); await submit();
    expect(Object.fromEntries(body(0))).toEqual({ username: 'one@example.com', password: md5('secret'), rememberMe: 'true' });
    expect(mocks.refetch).toHaveBeenCalledOnce(); expect(document.body.querySelector('output')!.textContent).toBe('/user/profile');
  });

  it('shows login errors without reading the response body twice', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: -114514, message: 'Service unavailable' }, { status: 500 }));
    await render('/login'); fill('username', 'player'); fill('password', 'secret'); await submit();
    expect(mocks.error).toHaveBeenCalledWith('Service unavailable');
    expect(document.body.querySelector<HTMLFieldSetElement>('fieldset')!.disabled).toBe(false);
  });

  it('closes the modal after a login without a redirect', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: 114514 }));
    await render('/login'); fill('username', 'player'); fill('password', 'secret'); await submit();
    expect(document.body.querySelector('output')!.textContent).toBe('/');
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes with Escape and switches to register from the footer link in place', async () => {
    await render('/login');
    expect(document.body.querySelector('[role="dialog"]')!.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.querySelector('button[aria-pressed]')).toBeNull();
    const goRegister = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === i18n.t('auth/AuthModal.GoRegister'))!;
    await act(async () => goRegister.click());
    expect(document.body.querySelector('output')!.textContent).toBe('/register');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    // 关闭动画播完才离开登录路由
    // act 里的状态更新要等 act 结束才生效，所以分多次短暂等待，直到路由变化（最多约 2 秒）
    for (let i = 0; i < 40 && document.body.querySelector('output')!.textContent !== '/'; i++) {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    }
    expect(document.body.querySelector('output')!.textContent).toBe('/');
    expect(document.body.style.overflow).toBe('');
  });
});
