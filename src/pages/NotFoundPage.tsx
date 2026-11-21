import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
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
  }, [navigate]);

  return (
    <PageLayout centered>
      {/* 居中的简单提示：大号 404、说明、倒计时和两个按钮，按钮样式和其他页面一致 */}
      <div className="flex flex-col justify-center items-center mx-auto px-4 py-10 max-w-xl text-center">
        <p className="bg-clip-text bg-linear-to-b from-white/80 to-white/15 m-0 font-bold text-transparent! text-7xl sm:text-8xl tabular-nums leading-none tracking-tight">
          404
        </p>
        <h1 className="m-0 mt-6 font-semibold text-white! text-xl! sm:text-2xl! tracking-tight">
          {t("not-found/NotFoundPage.Title")}
        </h1>
        <p className="m-0 mt-2 text-white/55! text-sm leading-relaxed">
          {t("not-found/NotFoundPage.Description")}
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            to="/"
            className="inline-flex items-center bg-blue-500 hover:bg-blue-400 px-5 rounded-xl h-11 font-semibold text-white text-sm no-underline transition-colors"
          >
            {t("not-found/NotFoundPage.BackHome")}
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center bg-white/[0.06] hover:bg-white/10 px-5 border border-white/10 hover:border-white/20 rounded-xl h-11 font-medium text-white/85 text-sm transition-colors cursor-pointer"
          >
            {t("not-found/NotFoundPage.GoBack")}
          </button>
        </div>
        <p className="m-0 mt-6 text-white/40! text-xs" aria-live="polite">
          {t("not-found/NotFoundPage.Redirect", { countdown })}
        </p>
      </div>
    </PageLayout>
  );
}
