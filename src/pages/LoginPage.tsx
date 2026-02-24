/**
 * 登录页面
 * 迁移自 legacy/src/app/login/page.jsx
 */

import React, { useEffect, useRef, useState } from 'react';
import 'react-photo-view/dist/react-photo-view.css';
import * as md5Module from 'js-md5';
const md5 = (md5Module as any).default || md5Module;
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout } from '@/components';
import * as retCode from '@/config/apiRetCode';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);
  const isPosted = useRef(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready && !isPosted.current) {
      PostOTP(loc);
      isPosted.current = true;
    }
  }, [ready, loc]);

  if (!ready) return <div className="loading"></div>;

  return <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <Login />
    </PageLayout>;
}

async function PostOTP(loc: (key: string, fallback?: string) => string) {
  const params = new URLSearchParams(window.location.search);
  const otp = params.get('otp');
  if (otp !== null) {
    const verifyRsp = await fetch(apiroot3 + '/account/verify?otp=' + otp, {
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
}

function Login() {
  const loc = useLoc();
  const navigate = useNavigate();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    const response = await fetch(apiroot3 + '/account/Login', {
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

    // 登录成功，返回之前的页面或主页
    if (document.referrer && document.referrer !== location.href) {
      history.back();
    } else {
      navigate('/');
    }
  }

  return (
    <div className="mx-auto mt-[calc(var(--header-height)+1rem)] px-4 py-8 w-full max-w-md">
      <div className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_40px_rgb(0_0_0/40%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-[20px] animate-[slideInUp_0.6s_ease-out_0.4s_both]">
        <div className="mb-8 text-center">
          <h2 className="m-0 mb-2 font-bold text-[#e5e5e5] text-3xl">{loc('WelcomeBack', '欢迎回来')}</h2>
          <p className="m-0 text-[#a0a0a0] text-sm">{loc('LoginSubtitle', '登录到你的账户')}</p>
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
          <div className="flex flex-row items-center gap-2">
            <input className="w-4 h-4" type="checkbox" name="rememberMe"></input>
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('RememberMe', '记住我')}</label>
          </div>

          <button className="relative bg-gradient-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed" type="submit">
            <span className="z-10 relative">{loc('Login', '登录')}</span>
          </button>
        </form>
        <div className="mt-8 pt-6 border-white/10 border-t text-center">
          <p className="m-0 text-[#a0a0a0] text-sm">
            <a href="/forget" className="font-medium text-blue-500 hover:text-blue-400 hover:underline no-underline transition-colors">
              {loc('ForgetPassword', '忘记密码？')}
            </a>
          </p>
          <p className="m-0 mt-2 text-[#a0a0a0] text-sm">
            <a href="/register" className="font-medium text-blue-500 hover:text-blue-400 hover:underline no-underline transition-colors">
              {loc('RegisterNow', '立即注册')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
