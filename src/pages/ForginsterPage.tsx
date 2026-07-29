import React, { useEffect, useRef, useState } from 'react';
import 'react-photo-view/dist/react-photo-view.css';
import { md5 } from 'js-md5';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout } from '@/components';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import * as retCode from '@/config/apiRetCode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import { AnimatePresence, motion } from 'framer-motion';

type TabType = 'login' | 'register' | 'forget';

const TAB_ORDER: TabType[] = ['login', 'register', 'forget'];
const AUTH_CARD_CLASSNAME = 'bg-[rgb(30_30_30/90%)] shadow-[0_20px_40px_rgb(0_0_0/40%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-[20px]';
const TURNSTILE_SITE_KEY = '0x4AAAAAACAEyA1EhHmEDS0o';
const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string }) => string;
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
    const handleError = () => reject(new Error('Cloudflare Turnstile failed to load'));

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

const tabTransitionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 64 : -64,
    opacity: 0,
    scale: 0.98,
    filter: 'blur(8px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -64 : 64,
    opacity: 0,
    scale: 0.985,
    filter: 'blur(8px)',
  }),
};

export default function ForginsterPage() {
  const loc = useLoc();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  const urlOtp = searchParams.get('otp');

  const getInitialTab = (): TabType => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/forget') return 'forget';
    return 'login';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [tabDirection, setTabDirection] = useState(1);
  const otp = urlOtp;

  const switchTab = (nextTab: TabType) => {
    if (nextTab === activeTab) return;
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = TAB_ORDER.indexOf(nextTab);
    setTabDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(nextTab);
  };

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  // OTP 部分逻辑
  useEffect(() => {
    if (ready && otp !== null) {
      if (window.location.pathname === '/login') {
        PostOTP(otp, loc);
      } else if (window.location.pathname === '/forget') {
        // Handle forget tab OTP logic if needed
      }
    }
  }, [ready, otp, loc, activeTab]);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <div className="mx-auto[calc(var(--header-height)+1rem)] px-4 py-8 w-full max-w-md">
        <div className="flex bg-black/40 mb-6 p-1 rounded-xl">
          <button
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'login'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
              }`}
            onClick={() => switchTab('login')}
          >
            {loc('Login', '登录')}
          </button>
          <button
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'register'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
              }`}
            onClick={() => switchTab('register')}
          >
            {loc('Register', '注册')}
          </button>
          <button
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'forget'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
              }`}
            onClick={() => switchTab('forget')}
          >
            {loc('ForgetPassword', '找回密码')}
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={tabTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'login' && <LoginTab />}
            {activeTab === 'register' && <RegisterTab />}
            {activeTab === 'forget' && <ForgetTab otp={otp} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

async function PostOTP(otp: string, loc: (key: string, fallback?: string) => string) {
  const verifyRsp = await fetch(endpoints.account.verify(otp), {
    method: 'GET',
    credentials: 'include',
  });
  if (verifyRsp.status !== 200) {
    if (verifyRsp.status === 400) {
      toast.error(loc('InvalidOTP', '无效的验证码'));
    } else {
      toast.error(loc('UnknownError', '未知错误'));
    }
  } else {
    toast.success(loc('AccountActivated', '账户已激活'));
  }
}

function LoginTab() {
  const loc = useLoc();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetch } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      if (formData.get('username') === '') {
        toast.error(loc('NoUsername', '请输入用户名'));
        return;
      }
      if (formData.get('password') === '') {
        toast.error(loc('NoPasswd', '请输入密码'));
        return;
      }
      formData.set('rememberMe', (formData.get('rememberMe') != null).toString());
      formData.set('password', md5(formData.get('password') as string));

      const response = await fetch(endpoints.account.login, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.status !== 200) {
        const rsp = await response.json();
        switch (rsp.code) {
          case retCode.CODE_INVALID_CREDENTIALS:
            toast.error(loc('WrongCredential', '用户名或密码错误'));
            break;
          case retCode.CODE_LOGIN_FAILED_PENDING_VERIFCATION:
            toast.error(loc('[Login]PendingVerifcation', '账户尚未激活，请查收邮件'));
            break;
          case retCode.CODE_LOGIN_FAILED_USER_BANNED:
            toast.error(loc('[Login]UserBanned', '账户已被封禁'));
            break;
          default:
            toast.error(await response.text());
            break;
        }
        return;
      }

      const redirectPath = searchParams.get('redirect');

      // 登录成功，刷新用户状态后再跳转
      await refetch();

      // 登录成功，优先跳转到显式指定的回跳地址
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
        return;
      }

      // 未指定回跳地址时，尝试返回之前页面，否则进入主页
      if (document.referrer && document.referrer !== location.href) {
        history.back();
      } else {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={AUTH_CARD_CLASSNAME + ' relative'}>
      <div className="mb-8 text-center">
        <h2 className="m-0 mb-2 font-bold text-[#e5e5e5] text-3xl">{loc('WelcomeBack', '欢迎回来')}</h2>
        <p className="m-0 text-[#a0a0a0] text-sm">{loc('LoginSubtitle', '登录到你的账户')}</p>
      </div>
      {isSubmitting && (
        <div className="z-10 absolute inset-0 flex justify-center items-center bg-[rgb(30_30_30/90%)] backdrop-blur-sm rounded-[20px]">
          <LoadingSpinner size="36px" />
        </div>
      )}
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('Username', '用户名')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="text"
            name="username"
            placeholder={loc('EnterUsername', '输入用户名')}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('Password', '密码')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="password"
            name="password"
            placeholder={loc('EnterPassword', '输入密码')}
            required
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <input className="w-4 h-4" type="checkbox" name="rememberMe"></input>
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('RememberMe', '记住我')}</label>
        </div>

        <button className="relative bg-linear-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed" type="submit" disabled={isSubmitting}>
          <span className="z-10 relative">{loc('Login', '登录')}</span>
        </button>
      </form>
    </div>
  );
}

function TurnstileWidget() {
  const loc = useLoc();
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
        widgetId = window.turnstile.render(container, { sitekey: TURNSTILE_SITE_KEY });
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
    <div className="relative w-[300px] h-[65px]" aria-live="polite">
      <div ref={containerRef} />
      {!isVisible && (
        <div className="absolute inset-0 flex items-center gap-3 bg-black/35 px-4 border border-white/15 border-dashed rounded-lg text-[#b8c7db] text-sm">
          <span className="inline-block border-2 border-blue-400/30 border-t-blue-400 rounded-full w-5 h-5 animate-spin" aria-hidden="true" />
          <span>{loc('WaitingForCloudflareVerification', '等待 Cloudflare 验证')}</span>
        </div>
      )}
    </div>
  );
}

function RegisterTab() {
  const loc = useLoc();
  const [isPosting, setIsPosting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const turnstileResponse = formData.get('cf-turnstile-response');
    if (typeof turnstileResponse !== 'string' || turnstileResponse.trim() === '') {
      toast.error(loc(
        'CloudflareVerificationNotReady',
        'Cloudflare 验证尚未完成，请检查网络后稍候重试',
      ));
      return;
    }

    setIsPosting(true);
    try {
      if (formData.get('password') !== formData.get('password2')) {
        toast.error(loc('PasswdNoMatch', '两次密码不匹配'));
        return;
      }
      formData.set('password', md5(formData.get('password') as string));

      const response = await fetch(endpoints.account.register, {
        method: 'POST',
        body: formData,
      });

      if (response.status !== 200) {
        const rsp = await response.json();
        if (response.status === 400) {
          switch (rsp.code) {
            case retCode.CODE_INVALID_INVITE_CODE:
              toast.error(loc('InvalidInviteCode', '无效的邀请码'));
              break;
            case retCode.CODE_INVALID_VALUE:
              toast.error(loc('InvalidUsernameOrPassword', '用户名或密码格式错误'));
              break;
            case retCode.CODE_INVALID_EMAIL_ADDRESS:
              toast.error(loc('InvalidEmail', '无效的邮箱地址'));
              break;
            case retCode.CODE_USERNAME_ALREADY_EXISTS:
              toast.error(loc('UsernameExists', '用户名已存在'));
              break;
            case retCode.CODE_EMAIL_ALREADY_EXISTS:
              toast.error(loc('EmailExists', '邮箱已被注册'));
              break;
            default: {
              const message = typeof rsp.message === 'string' ? rsp.message.trim() : '';
              toast.error(message
                ? `${loc('VerificationFailed', '验证失败：')}${message}`
                : loc('VerificationFailed', '验证失败'));
              break;
            }
          }
          return;
        }
        toast.error(await response.text());
        return;
      } else {
        toast.success(loc('[Register]EmailSent', '注册成功！验证邮件已发送'), {
          autoClose: false,
        });
      }
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className={AUTH_CARD_CLASSNAME}>
      <div className="mb-8 text-center">
        <h2 className="m-0 mb-2 font-bold text-[#e5e5e5] text-3xl">{loc('CreateAccount', '创建账户')}</h2>
        <p className="m-0 text-[#a0a0a0] text-sm">{loc('RegisterSubtitle', '注册一个新账户')}</p>
      </div>
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('Username', '用户名')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="text"
            name="username"
            placeholder={loc('EnterUsername', '输入用户名')}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('Password', '密码')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="password"
            name="password"
            placeholder={loc('EnterPassword', '输入密码')}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('ConfirmPassword', '确认密码')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="password"
            name="password2"
            placeholder={loc('ReEnterPassword', '再次输入密码')}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('E-Mail', '邮箱')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="email"
            name="email"
            placeholder={loc('EnterEmail', '输入邮箱')}
            required
          />
        </div>
        <div className="flex flex-col gap-2 scale-75 md:scale-100 origin-top-left">
          <TurnstileWidget />
        </div>
        <button className="relative bg-linear-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed" type="submit" disabled={isPosting}>
          <span className="z-10 relative">{loc('Register', '注册')}</span>
        </button>
      </form>
    </div>
  );
}

function ForgetTab({ otp }: { otp: string | null }) {
  const loc = useLoc();
  const [formOtp, setFormOtp] = useState(otp || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOtp = formOtp.trim() !== '';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);

      if (!hasOtp) {
        if (formData.get('username') === '') {
          toast.error(loc('NoUsername', '请输入用户名'));
          return;
        }
        if (formData.get('email') === '') {
          toast.error(loc('InvalidEmail', '无效的邮箱'));
          return;
        }

        const response = await fetch(endpoints.account.forget, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (response.status !== 200) {
          const rsp = await response.json();
          switch (rsp.code) {
            case retCode.CODE_INVALID_VALUE:
              toast.error(loc('UserNameOrEmailEmpty', '用户名或邮箱为空'));
              break;
            case retCode.CODE_NO_SUCH_ITEM:
              toast.error(loc('NoSuchUser', '用户不存在'));
              break;
            default:
              toast.error(await response.text());
              break;
          }
          return;
        }
        toast.success(loc('ResetEmailSent', '重置密码邮件已发送'), { autoClose: false });
      } else {
        if (formData.get('newpassword') === '' || formData.get('repeatpassword') === '') {
          toast.error(loc('NoPasswd', '请输入密码'));
          return;
        }

        if (formData.get('newpassword') !== formData.get('repeatpassword')) {
          toast.error(loc('PasswdNoMatch', '两次密码不匹配'));
          return;
        }

        formData.set('otp', formOtp);
        formData.set('newpassword', md5(formData.get('newpassword') as string));
        formData.delete('repeatpassword');

        const response = await fetch(endpoints.account.forget, {
          method: 'PUT',
          body: formData,
          credentials: 'include',
        });

        if (response.status !== 200) {
          const rsp = await response.json();
          switch (rsp.code) {
            case retCode.CODE_INVALID_VALUE:
              toast.error(loc('OTPExpiredOrEmpty', 'OTP已过期或为空'));
              break;
            default:
              toast.error(await response.text());
              break;
          }
          return;
        }
        toast.success(loc('ResetPasswordSuccess', '密码重置成功'), { autoClose: false });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={AUTH_CARD_CLASSNAME}>
      <div className="mb-8 text-center">
        <h2 className="m-0 mb-2 font-bold text-[#e5e5e5] text-3xl">
          {hasOtp ? loc('ResetPasswordTitle', '重设密码') : loc('ForgetPasswordTitle', '找回密码')}
        </h2>
        <p className="m-0 text-[#a0a0a0] text-sm">
          {hasOtp ? loc('ResetPasswordSubtitle', '请输入新的密码') : loc('ForgetPasswordSubtitle', '请输入注册时使用的用户名和邮箱')}
        </p>
      </div>
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        {hasOtp && (<>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('Password', '密码')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="password"
              name="newpassword"
              placeholder={loc('EnterPassword', '输入密码')}
              required={hasOtp}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('ConfirmPassword', '确认密码')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="password"
              name="repeatpassword"
              placeholder={loc('ReEnterPassword', '再次输入密码')}
              required={hasOtp}
            />
          </div>
        </>)}
        {!hasOtp && (<>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('Username', '用户名')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="text"
              name="username"
              placeholder={loc('EnterUsername', '输入用户名')}
              required={!hasOtp}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('E-Mail', '邮箱')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="email"
              name="email"
              placeholder={loc('EnterEmail', '输入邮箱')}
              required={!hasOtp}
            />
          </div>
        </>)}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#e5e5e5] text-sm">{loc('VerificationCode', '验证码')}</label>
          <input
            className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
            type="text"
            name="otp"
            value={formOtp}
            onChange={(e) => setFormOtp(e.target.value)}
            placeholder={loc('EnterVerificationCode', '输入验证码')}
          />
        </div>

        <button
          className="relative bg-linear-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
          type="submit"
          disabled={isSubmitting}
        >
          <span className="z-10 relative">
            {hasOtp ? loc('ResetPasswordButton', '确认重置密码') : loc('SendVerificationEmail', '发送验证邮件')}
          </span>
        </button>
      </form>
    </div>
  );
}
