import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout } from '@/components';

export default function NotFoundPage() {
  const loc = useLoc();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ready, navigate]);

  if (!ready) {
    return (
      <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-12.5 h-12.5 animate-[spin_0.1s_linear_infinite]"></div>
    );
  }

  return (
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <div 
        className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md mx-auto p-12 border border-white/10 rounded-2xl max-w-2xl text-center"
        style={{
          animation: 'slideInUp 0.6s ease-out both'
        }}
      >
        {/* 404标题 */}
        <h1 
          className="m-0 mb-6 font-bold text-[#e5e5e5] text-[6rem] leading-none"
          style={{
            textShadow: '0 0 20px #a78bfa, 0 0 40px #60a5fa'
          }}
        >
          404
        </h1>

        {/* 错误信息 */}
        <div className="mb-8">
          <p 
            className="mb-4 font-semibold text-[#e5e5e5] text-[1.5rem]"
            style={{
              textShadow: '0 0 2px #a78bfa'
            }}
          >
            {loc('notfound.title', '页面未找到')}
          </p>
          <p className="text-[#b8b8b8] text-[1rem] leading-relaxed">
            {loc('notfound.description', '抱歉，您访问的页面不存在或已被移除。')}
          </p>
        </div>

        {/* 自动跳转提示 */}
        <div className="bg-[rgba(167,139,250,0.1)] mb-8 p-4 border border-[rgba(167,139,250,0.3)] rounded-lg">
          <p className="text-[#d4c5f9] text-[0.95rem]">
            {loc('notfound.redirect', `${countdown} 秒后自动返回首页...`).replace('${countdown}', String(countdown))}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="bg-linear-to-r from-purple-500 to-blue-500 hover:shadow-[0_0_20px_rgba(167,139,250,0.6)] px-8 py-3 rounded-lg font-semibold text-white no-underline hover:scale-105 transition-all duration-300"
          >
            {loc('notfound.backHome', '返回首页')}
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] px-8 py-3 border border-white/20 rounded-lg font-semibold text-white hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            {loc('notfound.goBack', '返回上一页')}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
