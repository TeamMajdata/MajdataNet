import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { md5 } from 'js-md5';
import { toast } from 'react-toastify';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ApiError, apiRequest } from '@/utils/apiClient';
import * as retCode from '@/config/apiRetCode';

type TabType = 'login' | 'register' | 'forget';
const INPUT_CLASSNAME = 'w-full min-w-0 bg-black/40 px-3.5 h-11 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 rounded-lg outline-none text-white placeholder:text-white/30 transition-colors disabled:opacity-50';
const BUTTON_CLASSNAME = 'flex justify-center items-center bg-blue-500 hover:bg-blue-400 disabled:hover:bg-blue-500 disabled:opacity-50 h-11 rounded-lg font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed';
const SECONDARY_BUTTON_CLASSNAME = 'flex justify-center items-center bg-white/[0.06] hover:bg-white/10 disabled:hover:bg-white/[0.06] disabled:opacity-50 border border-white/10 h-11 rounded-lg font-medium text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed';
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
  const { t } = useTranslation();
  const location = useLocation();
  const { pathname, search } = location;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const titleId = useId();
  const pressedOnBackdrop = useRef(false);
  const activeTab: TabType = pathname === '/register' ? 'register' : pathname === '/forget' ? 'forget' : 'login';
  const close = useCloseAuth();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close]);

  return (
    <div
      className="z-1100 fixed inset-0 flex justify-center items-start sm:items-center bg-black/60 backdrop-blur-sm px-3 py-[max(1rem,env(safe-area-inset-top))] overflow-y-auto overscroll-contain"
      onMouseDown={event => { pressedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={event => { if (pressedOnBackdrop.current && event.target === event.currentTarget) close(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative bg-[rgb(18_20_27/97%)] shadow-[0_24px_70px_rgb(0_0_0/55%),0_1px_0_rgb(255_255_255/6%)_inset] my-auto p-5 sm:p-7 border border-white/10 rounded-2xl w-full max-w-md min-w-0">
        <button type="button" onClick={close} aria-label={t("auth/ForginsterPage.Close")}
          className="top-3 right-3 absolute place-items-center grid hover:bg-white/10 rounded-lg w-9 h-9 text-white/50 hover:text-white transition-colors cursor-pointer">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="w-4 h-4" fill="none">
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex gap-1 bg-white/[0.04] mt-8 sm:mt-6 mb-6 p-1 border border-white/[0.06] rounded-xl">
          {(['login', 'register', 'forget'] as const).map(tab => (
            <button key={tab} type="button" aria-pressed={tab === activeTab}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === activeTab ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
              onClick={() => {
                const params = new URLSearchParams(search);
                params.delete('otp');
                navigate({ pathname: `/${tab}`, search: params.toString() }, { replace: true, state: location.state });
              }}>
              {tab === 'login' ? t("auth/ForginsterPage.Login") : tab === 'register' ? t("auth/ForginsterPage.Register") : t("auth/ForginsterPage.ForgetPassword")}
            </button>
          ))}
        </div>
        {searchParams.has('otp') && <p role="status" className="mb-4 text-amber-200 text-sm">{t("auth/ForginsterPage.LegacyLink")}</p>}
        {activeTab === 'login' ? <LoginTab titleId={titleId} /> : <ChallengeTab key={activeTab} mode={activeTab} titleId={titleId} />}
      </div>
    </div>
  );
}

/** Leaves the modal: back to the page underneath, or home when the modal was opened directly. */
function useCloseAuth() {
  const navigate = useNavigate();
  return useCallback(() => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);
}

function Field({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <label className="flex flex-col gap-1.5 text-white/70 text-sm">
    <span>{label}</span>
    <input className={INPUT_CLASSNAME} name={name} {...props} />
  </label>;
}

function useAuthError() {
  const { t } = useTranslation();
  return (error: unknown) => {
    if (!(error instanceof ApiError)) {
      toast.error(t("auth/ForginsterPage.NetworkError"));
      return;
    }
    if (error.status === 429) {
      toast.error(t("auth/ForginsterPage.TooManyRequests"));
      return;
    }
    switch (error.code) {
      case retCode.CODE_INVALID_EMAIL_ADDRESS: toast.error(t("auth/ForginsterPage.InvalidEmail")); break;
      case retCode.CODE_USERNAME_ALREADY_EXISTS: toast.error(t("auth/ForginsterPage.UsernameExists")); break;
      case retCode.CODE_EMAIL_ALREADY_EXISTS: toast.error(t("auth/ForginsterPage.EmailExists")); break;
      case retCode.CODE_LOGIN_FAILED_PENDING_VERIFCATION: toast.error(t("auth/ForginsterPage.LoginPendingVerification")); break;
      case retCode.CODE_LOGIN_FAILED_USER_BANNED: toast.error(t("auth/ForginsterPage.LoginUserBanned")); break;
      default: toast.error(error.message);
    }
  };
}

function LoginTab({ titleId }: { titleId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const close = useCloseAuth();
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
      if (redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\')) navigate(redirect, { replace: true });
      else close();
    } catch (error) {
      if (error instanceof ApiError && error.code === retCode.CODE_INVALID_CREDENTIALS) toast.error(t("auth/ForginsterPage.WrongCredential"));
      else showError(error);
    } finally { setBusy(false); }
  }

  return <div>
    <h2 id={titleId} className="mb-1 font-semibold! text-white! text-2xl! text-left!">{t("auth/ForginsterPage.WelcomeBack")}</h2>
    <p className="mb-6 text-white/50! text-sm">{t("auth/ForginsterPage.LoginSubtitle")}</p>
    <form onSubmit={onSubmit}>
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <Field label={t("auth/ForginsterPage.UsernameOrEmail")} name="username" autoComplete="username" autoFocus required />
        <Field label={t("auth/ForginsterPage.Password")} name="password" type="password" autoComplete="current-password" required />
        <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer"><input type="checkbox" name="rememberMe" className="accent-blue-500" />{t("auth/ForginsterPage.RememberMe")}</label>
        <button className={BUTTON_CLASSNAME} type="submit">{busy ? <LoadingSpinner size={20} /> : t("auth/ForginsterPage.Login")}</button>
      </fieldset>
    </form>
  </div>;
}

/** A challenge key belongs to one email address and expires after five minutes. */
function ChallengeTab({ mode, titleId }: { mode: 'register' | 'forget'; titleId: string }) {
  const registering = mode === 'register';
  const { t } = useTranslation();
  const { refetch } = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { search } = location;
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
      toast.success(t("auth/ForginsterPage.CodeSent"));
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
      toast.error(t("auth/ForginsterPage.RequestCodeFirst"));
      return;
    }
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('password2')) {
      toast.error(t("auth/ForginsterPage.PasswdNoMatch"));
      return;
    }
    if (registering && !String(form.get('cf-turnstile-response') ?? '').trim()) {
      toast.error(t("auth/ForginsterPage.CloudflareVerificationNotReady"));
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
      toast.success(registering ? t("auth/ForginsterPage.RegisterSuccess") : t("auth/ForginsterPage.ResetPasswordSuccess"));
      if (!registering) await refetch(); // Password reset revokes every existing session.
      const params = new URLSearchParams(search);
      params.delete('otp');
      navigate({ pathname: '/login', search: params.toString() }, { replace: true, state: location.state });
    } catch (error) {
      showError(error);
      // Registration consumes the challenge before checking captcha and uniqueness.
      // A lost response may also have consumed it, so require a fresh code on retry.
      setChallenge(null);
      setCode('');
      setCaptchaVersion(value => value + 1);
      toast.info(t("auth/ForginsterPage.RequestNewCode"));
    } finally { setSubmitting(false); }
  }

  return <div>
    <h2 id={titleId} className="mb-1 font-semibold! text-white! text-2xl! text-left!">{registering ? t("auth/ForginsterPage.CreateAccount") : t("auth/ForginsterPage.ForgetPasswordTitle")}</h2>
    <p className="mb-6 text-white/50! text-sm">{registering ? t("auth/ForginsterPage.RegisterSubtitle") : t("auth/ForginsterPage.ForgetPasswordSubtitle")}</p>
    <form onSubmit={onSubmit}>
      <fieldset disabled={busy} className="flex flex-col gap-4">
        {registering && <>
          <Field label={t("auth/ForginsterPage.Username")} name="username" autoComplete="username" autoFocus maxLength={24} pattern="[A-Za-z0-9]+"
            placeholder={t("auth/ForginsterPage.UsernameHint")}
            onInvalid={event => event.currentTarget.setCustomValidity(event.currentTarget.validity.patternMismatch ? t("auth/ForginsterPage.UsernameHint") : '')}
            onInput={event => event.currentTarget.setCustomValidity('')} required />
          <Field label={t("auth/ForginsterPage.Nickname")} name="nickname" autoComplete="nickname" required />
        </>}
        <label className="flex flex-col gap-1.5 text-white/70 text-sm">
          <span>{t("auth/ForginsterPage.EmailLabel")}</span>
          <input ref={emailRef} className={INPUT_CLASSNAME} name="email" type="email" autoComplete="email" autoFocus={!registering} required value={email} onChange={event => {
            setEmail(event.target.value);
            setChallenge(null);
            setCode('');
          }} />
        </label>
        <button className={SECONDARY_BUTTON_CLASSNAME} type="button" disabled={busy || seconds > 0} onClick={sendCode}>
          {sending ? t("auth/ForginsterPage.SendingCode") : seconds > 0 ? t("auth/ForginsterPage.ResendCode", { seconds }) : t("auth/ForginsterPage.SendCode")}
        </button>
        <p role="status" className="-mt-1 text-white/45! text-xs">{expired ? t("auth/ForginsterPage.CodeExpired") : challenge ? t("auth/ForginsterPage.CodeSent") : t("auth/ForginsterPage.RequestCodeFirst")}</p>
        <Field label={t("auth/ForginsterPage.VerificationCode")} name="challengeCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} minLength={8} placeholder={t("auth/ForginsterPage.EightDigitCode")} value={code} onChange={event => setCode(event.target.value)} required />
        <Field label={t("auth/ForginsterPage.Password")} name="password" type="password" autoComplete="new-password" required />
        <Field label={t("auth/ForginsterPage.ConfirmPassword")} name="password2" type="password" autoComplete="new-password" required />
        {registering && <TurnstileWidget key={captchaVersion} />}
        <button className={BUTTON_CLASSNAME} type="submit" disabled={busy || !challenge || expired}>
          {submitting ? <LoadingSpinner size={20} /> : registering ? t("auth/ForginsterPage.Register") : t("auth/ForginsterPage.ResetPasswordButton")}
        </button>
      </fieldset>
    </form>
  </div>;
}

function TurnstileWidget() {
  const { t } = useTranslation();
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
          <span>{t("auth/ForginsterPage.WaitingForCloudflareVerification")}</span>
        </div>
      )}
    </div>
  );
}
