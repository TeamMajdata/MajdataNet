import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { md5 } from 'js-md5';
import { toast } from 'react-toastify';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { useI18n, useUserContext } from '@/hooks';
import { PageLayout } from '@/components';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ApiError, apiRequest } from '@/utils/apiClient';
import * as retCode from '@/config/apiRetCode';

type TabType = 'login' | 'register' | 'forget';
const AUTH_CARD_CLASSNAME = 'bg-[rgb(30_30_30/90%)] shadow-[0_20px_40px_rgb(0_0_0/40%)] backdrop-blur-[20px] p-4 sm:p-8 border border-white/10 rounded-[20px]';
const INPUT_CLASSNAME = 'w-full min-w-0 bg-black/60 p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white disabled:opacity-50';
const BUTTON_CLASSNAME = 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-4 rounded-xl font-semibold text-white cursor-pointer disabled:cursor-not-allowed';
const TURNSTILE_SITE_KEY = '0x4AAAAAACAEyA1EhHmEDS0o';
const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; size?: 'normal' | 'compact' }) => string;
  remove?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement('script');

    const handleLoad = () => resolve();
    const handleError = () => {
      turnstileScriptPromise = null;
      script.remove();
      reject(new Error('Cloudflare Turnstile failed to load'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return turnstileScriptPromise;
}


export default function ForginsterPage() {
  const { i18n, isReady } = useI18n();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab: TabType = pathname === '/register' ? 'register' : pathname === '/forget' ? 'forget' : 'login';
  if (!isReady) return <LoadingSpinner size="50px" />;

  return (
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <div className="mx-auto px-0 sm:px-4 py-4 sm:py-8 w-full max-w-md min-w-0">
        <div className="flex bg-black/40 mb-6 p-1 rounded-xl">
          {(['login', 'register', 'forget'] as const).map(tab => (
            <button key={tab} type="button" aria-pressed={tab === activeTab}
              className={`flex-1 py-3 rounded-lg text-sm ${tab === activeTab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              onClick={() => {
                const params = new URLSearchParams(search);
                params.delete('otp');
                navigate({ pathname: `/${tab}`, search: params.toString() });
              }}>
              {tab === 'login' ? i18n("auth/ForginsterPage.Login") : tab === 'register' ? i18n("auth/ForginsterPage.Register") : i18n("auth/ForginsterPage.ForgetPassword")}
            </button>
          ))}
        </div>
        {searchParams.has('otp') && <p role="status" className="mb-4 text-amber-200 text-sm">{i18n("auth/ForginsterPage.LegacyLink", '邮件链接验证已停用，请重新获取验证码；旧账户激活问题请联系管理员。')}</p>}
        {activeTab === 'login' ? <LoginTab /> : <ChallengeTab key={activeTab} mode={activeTab} />}
      </div>
    </PageLayout>
  );
}

function Field({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <label className="flex flex-col gap-2 text-[#e5e5e5] text-sm">
    <span>{label}</span>
    <input className={INPUT_CLASSNAME} name={name} {...props} />
  </label>;
}

function useAuthError() {
  const { i18n } = useI18n();
  return (error: unknown) => {
    if (!(error instanceof ApiError)) {
      toast.error(i18n("auth/ForginsterPage.NetworkError", '网络请求失败，请重试'));
      return;
    }
    if (error.status === 429) {
      toast.error(i18n("auth/ForginsterPage.TooManyRequests", '请求过于频繁，请稍后再试'));
      return;
    }
    switch (error.code) {
      case retCode.CODE_INVALID_EMAIL_ADDRESS: toast.error(i18n("auth/ForginsterPage.InvalidEmail")); break;
      case retCode.CODE_USERNAME_ALREADY_EXISTS: toast.error(i18n("auth/ForginsterPage.UsernameExists")); break;
      case retCode.CODE_EMAIL_ALREADY_EXISTS: toast.error(i18n("auth/ForginsterPage.EmailExists")); break;
      case retCode.CODE_LOGIN_FAILED_PENDING_VERIFCATION: toast.error(i18n("auth/ForginsterPage.LoginPendingVerification")); break;
      case retCode.CODE_LOGIN_FAILED_USER_BANNED: toast.error(i18n("auth/ForginsterPage.LoginUserBanned")); break;
      default: toast.error(error.message);
    }
  };
}

function LoginTab() {
  const { i18n } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refetch } = useUserContext();
  const [busy, setBusy] = useState(false);
  const showError = useAuthError();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    form.set('password', md5(String(form.get('password'))));
    form.set('rememberMe', String(form.has('rememberMe')));
    setBusy(true);
    try {
      try {
        await apiRequest(endpoints.account.login, { method: 'POST', body: form });
      } catch (error) {
        if (!(error instanceof ApiError && error.code === retCode.CODE_ALREADY_LOGGED_IN)) throw error;
      }
      await refetch();
      const redirect = params.get('redirect');
      navigate(redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\') ? redirect : '/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === retCode.CODE_INVALID_CREDENTIALS) toast.error(i18n("auth/ForginsterPage.WrongCredential"));
      else showError(error);
    } finally { setBusy(false); }
  }

  return <div className={AUTH_CARD_CLASSNAME}>
    <h2 className="mb-2 font-bold text-white text-3xl text-center">{i18n("auth/ForginsterPage.WelcomeBack")}</h2>
    <p className="mb-8 text-gray-400 text-sm text-center">{i18n("auth/ForginsterPage.LoginSubtitle")}</p>
    <form onSubmit={onSubmit}>
      <fieldset disabled={busy} className="flex flex-col gap-6">
        <Field label={i18n("auth/ForginsterPage.UsernameOrEmail", '用户名或邮箱')} name="username" autoComplete="username" required />
        <Field label={i18n("auth/ForginsterPage.Password")} name="password" type="password" autoComplete="current-password" required />
        <label className="flex items-center gap-2 text-white text-sm"><input type="checkbox" name="rememberMe" />{i18n("auth/ForginsterPage.RememberMe")}</label>
        <button className={BUTTON_CLASSNAME} type="submit">{busy ? <LoadingSpinner size={24} /> : i18n("auth/ForginsterPage.Login")}</button>
      </fieldset>
    </form>
  </div>;
}

/** A challenge key belongs to one email address and expires after five minutes. */
function ChallengeTab({ mode }: { mode: 'register' | 'forget' }) {
  const registering = mode === 'register';
  const { i18n } = useI18n();
  const { refetch } = useUserContext();
  const navigate = useNavigate();
  const { search } = useLocation();
  const showError = useAuthError();
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<{ key: string; expiresAt: number } | null>(null);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const emailRef = useRef<HTMLInputElement>(null);
  const busy = sending || submitting;
  const expired = !!challenge && now >= challenge.expiresAt;
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));

  useEffect(() => {
    if (!challenge && !retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, retryAt]);

  async function sendCode() {
    if (busy || seconds > 0 || !emailRef.current?.reportValidity()) return;
    setSending(true);
    setChallenge(null);
    setCode('');
    try {
      const form = new FormData();
      form.set('email', email);
      const key = await apiRequest<string>(registering ? endpoints.account.emailChallenge : endpoints.account.passwordResetRequest(email), {
        method: 'POST', ...(registering ? { body: form } : {}),
      });
      if (typeof key !== 'string' || !key.trim()) throw new Error('Missing challenge key');
      const timestamp = Date.now();
      setNow(timestamp);
      setChallenge({ key, expiresAt: timestamp + 5 * 60_000 });
      setRetryAt(timestamp + 30_000);
      toast.success(i18n("auth/ForginsterPage.CodeSent", '如果邮箱可用，验证码将发送到邮箱，请在 5 分钟内填写。'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setNow(Date.now());
        setRetryAt(Date.now() + 60_000);
      }
      showError(error);
    } finally { setSending(false); }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!challenge || Date.now() >= challenge.expiresAt) {
      toast.error(i18n("auth/ForginsterPage.RequestCodeFirst", '请先获取有效的邮箱验证码'));
      return;
    }
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('password2')) {
      toast.error(i18n("auth/ForginsterPage.PasswdNoMatch"));
      return;
    }
    if (registering && !String(form.get('cf-turnstile-response') ?? '').trim()) {
      toast.error(i18n("auth/ForginsterPage.CloudflareVerificationNotReady"));
      return;
    }
    const password = md5(String(form.get('password')));
    form.delete('password2');
    form.delete('password');
    form.set(registering ? 'password' : 'newPassword', password);
    form.set('email', email);
    form.set('challengeKey', challenge.key);
    form.set('challengeCode', code);
    setSubmitting(true);
    try {
      await apiRequest(registering ? endpoints.account.register : endpoints.account.passwordResetConfirm, { method: 'POST', body: form });
      toast.success(registering ? i18n("auth/ForginsterPage.RegisterSuccess", '注册成功，请登录') : i18n("auth/ForginsterPage.ResetPasswordSuccess"));
      if (!registering) await refetch(); // Password reset revokes every existing session.
      const params = new URLSearchParams(search);
      params.delete('otp');
      navigate({ pathname: '/login', search: params.toString() }, { replace: true });
    } catch (error) {
      showError(error);
      // Registration consumes the challenge before checking captcha and uniqueness.
      // A lost response may also have consumed it, so require a fresh code on retry.
      setChallenge(null);
      setCode('');
      setCaptchaVersion(value => value + 1);
      toast.info(i18n("auth/ForginsterPage.RequestNewCode", '请重新获取验证码后再提交'));
    } finally { setSubmitting(false); }
  }

  return <div className={AUTH_CARD_CLASSNAME}>
    <h2 className="mb-2 font-bold text-white text-3xl text-center">{registering ? i18n("auth/ForginsterPage.CreateAccount") : i18n("auth/ForginsterPage.ForgetPasswordTitle")}</h2>
    <p className="mb-8 text-gray-400 text-sm text-center">{registering ? i18n("auth/ForginsterPage.RegisterSubtitle") : i18n("auth/ForginsterPage.ForgetPasswordSubtitle")}</p>
    <form onSubmit={onSubmit}>
      <fieldset disabled={busy} className="flex flex-col gap-5">
        {registering && <>
          <Field label={i18n("auth/ForginsterPage.Username")} name="username" autoComplete="username" maxLength={24} pattern="[A-Za-z0-9_-]+" title={i18n("auth/ForginsterPage.UsernameHint", '最多 24 位，仅限字母、数字、下划线和连字符')} required />
          <Field label={i18n("auth/ForginsterPage.Nickname", '昵称')} name="nickname" autoComplete="nickname" required />
        </>}
        <label className="flex flex-col gap-2 text-white text-sm">
          <span>{i18n("auth/ForginsterPage.EmailLabel")}</span>
          <input ref={emailRef} className={INPUT_CLASSNAME} name="email" type="email" autoComplete="email" required value={email} onChange={event => {
            setEmail(event.target.value);
            setChallenge(null);
            setCode('');
          }} />
        </label>
        <button className={BUTTON_CLASSNAME} type="button" disabled={busy || seconds > 0} onClick={sendCode}>
          {sending ? i18n("auth/ForginsterPage.SendingCode", '正在发送…') : seconds > 0 ? `${i18n("auth/ForginsterPage.ResendCode", '重新发送')} (${seconds}s)` : i18n("auth/ForginsterPage.SendCode", '发送验证码')}
        </button>
        <p role="status" className="text-gray-400 text-sm">{expired ? i18n("auth/ForginsterPage.CodeExpired", '验证码已过期，请重新获取') : challenge ? i18n("auth/ForginsterPage.CodeSent") : i18n("auth/ForginsterPage.RequestCodeFirst")}</p>
        <Field label={i18n("auth/ForginsterPage.VerificationCode")} name="challengeCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} minLength={8} placeholder={i18n("auth/ForginsterPage.EightDigitCode", '8 位数字验证码')} value={code} onChange={event => setCode(event.target.value)} required />
        <Field label={i18n("auth/ForginsterPage.Password")} name="password" type="password" autoComplete="new-password" required />
        <Field label={i18n("auth/ForginsterPage.ConfirmPassword")} name="password2" type="password" autoComplete="new-password" required />
        {registering && <TurnstileWidget key={captchaVersion} />}
        <button className={BUTTON_CLASSNAME} type="submit" disabled={busy || !challenge || expired}>
          {submitting ? <LoadingSpinner size={24} /> : registering ? i18n("auth/ForginsterPage.Register") : i18n("auth/ForginsterPage.ResetPasswordButton")}
        </button>
      </fieldset>
    </form>
  </div>;
}

function TurnstileWidget() {
  const { i18n } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let widgetId: string | undefined;
    const hasRenderedWidget = () => container.childElementCount > 0;
    const updateVisibility = () => setIsVisible(hasRenderedWidget());
    const observer = new MutationObserver(updateVisibility);

    observer.observe(container, { childList: true, subtree: true });
    updateVisibility();

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || hasRenderedWidget()) return;
        widgetId = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          size: window.innerWidth < 360 ? 'compact' : 'normal',
        });
        updateVisibility();
      })
      .catch(() => {
        // The placeholder remains visible when Cloudflare cannot be reached.
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      if (widgetId) window.turnstile?.remove?.(widgetId);
    };
  }, []);

  return (
    <div className="relative w-full max-w-[300px] min-h-[65px]" aria-live="polite">
      <div ref={containerRef} />
      {!isVisible && (
        <div className="absolute inset-0 flex items-center gap-3 bg-black/35 px-4 border border-white/15 border-dashed rounded-lg text-[#b8c7db] text-sm">
          <span className="inline-block border-2 border-blue-400/30 border-t-blue-400 rounded-full w-5 h-5 animate-spin" aria-hidden="true" />
          <span>{i18n("auth/ForginsterPage.WaitingForCloudflareVerification", '等待 Cloudflare 验证')}</span>
        </div>
      )}
    </div>
  );
}
