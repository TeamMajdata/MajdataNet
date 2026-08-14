import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, LoadingSpinner } from '@/components';

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

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <div
        className="mx-auto p-12 rounded-xl max-w-2xl text-center"
        style={{
          animation: 'slideInUp 0.6s ease-out both'
        }}
      >
        {/* 404标题 */}
        <h1
          className="m-0 mb-6 font-bold text-ink text-[6rem] leading-none"
        >
          404
        </h1>

        {/* 错误信息 */}
        <div className="mb-8">
          <p
            className="mb-4 font-semibold text-ink text-[1.5rem]"
          >
            {loc('notfound.title', '页面未找到')}
          </p>
          <p className="text-ink-2 text-[1rem] leading-relaxed">
            {loc('notfound.description', '抱歉，您访问的页面不存在或已被移除。')}
          </p>
        </div>

        {/* 自动跳转提示 */}
        <div className="bg-primary-soft mb-8 p-4 border border-primary/30 rounded-lg">
          <p className="text-primary text-[0.95rem]">
            {loc('notfound.redirect', `${countdown} 秒后自动返回首页...`).replace('${countdown}', String(countdown))}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="bg-primary hover:bg-primary-hover px-8 py-3 rounded-md font-semibold text-white no-underline transition-colors duration-200"
          >
            {loc('notfound.backHome', '返回首页')}
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="bg-surface hover:border-primary/40 px-8 py-3 border border-line rounded-md font-semibold text-ink-2 hover:text-primary transition-colors duration-200 cursor-pointer"
          >
            {loc('notfound.goBack', '返回上一页')}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
