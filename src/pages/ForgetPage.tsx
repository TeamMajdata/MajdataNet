import React, { useEffect, useState } from 'react';
import 'react-photo-view/dist/react-photo-view.css';
import { md5 } from 'js-md5';
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, LoadingSpinner } from '@/components';
import * as retCode from '@/config/apiRetCode';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ForgetPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  const params = new URLSearchParams(window.location.search);
  const otp = params.get('otp');

  return (
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      {otp !== null ? <ResetPassword otp={otp} /> : <FindAccount />}
    </PageLayout>
  );
}

function FindAccount() {
  const loc = useLoc();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    if (formData.get('username') === '') {
      toast.error(loc('NoUsername', '请输入用户名'));
      return;
    }
    if (formData.get('email') === '') {
      toast.error(loc('InvalidEmail', '无效的邮箱'));
      return;
    }

    const response = await fetch(apiroot3 + '/account/forget', {
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
  }

  return (
    <div className="mx-auto mt-[calc(var(--header-height)+1rem)] px-4 py-8 w-full max-w-md">
      <motion.div
        className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_40px_rgb(0_0_0/40%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-[20px]"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      >
        <div className="mb-8 text-center">
          <h2 className="m-0 mb-2 font-bold text-[#e5e5e5] text-3xl">{loc('ForgetPasswordTitle', '忘记密码')}</h2>
          <p className="m-0 text-[#a0a0a0] text-sm">{loc('ForgetPasswordSubtitle', '输入用户名和邮箱找回密码')}</p>
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
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('E-Mail', '邮箱')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="email"
              name="email"
              placeholder={loc('EnterEmail', '输入邮箱')}
              required
            />
          </div>

          <button className="relative bg-linear-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed" type="submit">
            <span className="z-10 relative">{loc('SendVerificationEmail', '发送验证邮件')}</span>
          </button>
        </form>
        <div className="mt-8 pt-6 border-white/10 border-t text-center">
          <p className="m-0 text-[#a0a0a0] text-sm">
            {loc('RememberPassword', '记得密码？')}{' '}
            <Link to="/login" className="font-medium text-blue-500 hover:text-blue-400 hover:underline no-underline transition-colors">
              {loc('Login', '登录')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ResetPassword({ otp }: { otp: string }) {
  const loc = useLoc();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    if (formData.get('newpassword') === '') {
      toast.error(loc('NoPasswd', '请输入密码'));
      return;
    }
    if (formData.get('newpassword-2') === '') {
      toast.error(loc('NoPasswd', '请输入密码'));
      return;
    }
    if (formData.get('newpassword') !== formData.get('newpassword-2')) {
      toast.error(loc('PasswdNoMatch', '两次密码不匹配'));
      return;
    }
    formData.set('otp', otp);
    formData.set('newpassword', md5(formData.get('newpassword') as string));
    formData.delete('newpassword-2');

    const response = await fetch(apiroot3 + '/account/forget', {
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

  return (
    <div className="mx-auto mt-[calc(var(--header-height)+1rem)] px-4 py-8 w-full max-w-md">
      <motion.div
        className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_40px_rgb(0_0_0/40%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-[20px]"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      >
        <div className="mb-8 text-center">
          <h2 className="m-0 mb-2 font-bold text-[#e5e5e5] text-3xl">{loc('ResetPasswordTitle', '重置密码')}</h2>
          <p className="m-0 text-[#a0a0a0] text-sm">{loc('ResetPasswordSubtitle', '输入新密码')}</p>
        </div>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('Password', '密码')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="password"
              name="newpassword"
              placeholder={loc('EnterPassword', '输入密码')}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#e5e5e5] text-sm">{loc('ConfirmPassword', '确认密码')}</label>
            <input
              className="bg-black/60 focus:shadow-[0_0_15px_rgb(59_130_246/20%)] p-4 border-2 border-white/10 focus:border-blue-500 rounded-xl outline-none text-white placeholder:text-white/40 transition-all focus:-translate-y-0.5"
              type="password"
              name="newpassword-2"
              placeholder={loc('ReEnterPassword', '再次输入密码')}
              required
            />
          </div>

          <button className="relative bg-linear-to-r from-blue-500 hover:from-blue-700 to-blue-700 hover:to-blue-800 disabled:opacity-50 hover:shadow-[0_10px_25px_rgb(59_130_246/30%)] mt-2 p-4 border-none rounded-xl overflow-hidden font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed" type="submit">
            <span className="z-10 relative">{loc('ResetPasswordButton', '重置密码')}</span>
          </button>
        </form>
        <div className="mt-8 pt-6 border-white/10 border-t text-center">
          <p className="m-0 text-[#a0a0a0] text-sm">
            {loc('RememberPassword', '记得密码？')}{' '}
            <Link to="/login" className="font-medium text-blue-500 hover:text-blue-400 hover:underline no-underline transition-colors">
              {loc('Login', '登录')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
