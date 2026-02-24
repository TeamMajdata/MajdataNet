/**
 * 注册页面
 * 迁移自 legacy/src/app/register/page.jsx
 */

import React, { useEffect, useState } from 'react';
import 'react-photo-view/dist/react-photo-view.css';
import * as md5Module from 'js-md5';
const md5 = (md5Module as any).default || md5Module;
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { loc, setLanguage } from '@/utils/i18n';
import { PageLayout } from '@/components';
import * as retCode from '@/config/apiRetCode';

export default function RegisterPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="loading"></div>;

  return (
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <Register />
    </PageLayout>
  );
}

function Register() {
  const [isPosting, setIsPosting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    setIsPosting(true);
    try {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      if (formData.get('password') !== formData.get('password2')) {
        toast.error(loc('PasswdNoMatch', '两次密码不匹配'));
        return;
      }
      formData.set('password', md5(formData.get('password') as string));

      const response = await fetch(apiroot3 + '/account/Register', {
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
            default:
              toast.error(loc('VerificationFailed', '验证失败') + rsp.message);
              break;
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
    <div className="mx-auto mt-[calc(var(--header-height)+1rem)] px-4 py-8 w-full max-w-md">
      <div className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_40px_rgb(0_0_0/40%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-[20px] animate-[slideInUp_0.6s_ease-out_0.4s_both]">
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
          <div className="flex flex-col gap-2">
            <script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              async
              defer
            ></script>
            <div className="cf-turnstile" data-sitekey="0x4AAAAAACAEyA1EhHmEDS0o"></div>
          </div>
          <button className="relative bg-gradient-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed" type="submit" disabled={isPosting}>
            <span className="z-10 relative">{loc('Register', '注册')}</span>
          </button>
        </form>
        <div className="mt-8 pt-6 border-white/10 border-t text-center">
          <p className="m-0 text-[#a0a0a0] text-sm">
            {loc('AlreadyHaveAccount', '已有账户？')}{' '}
            <a href="/login" className="font-medium text-blue-500 hover:text-blue-400 hover:underline no-underline transition-colors">
              {loc('LoginNow', '立即登录')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
