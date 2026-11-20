import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ToastContainer, cssTransition } from 'react-toastify';
import { FaDiscord, FaGithub, FaQq } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { UnifiedHeader } from '@/components';
import AmbientBackground from './AmbientBackground';
import FloatingButtons from './FloatingButtons';
import ToastIcon from '@/components/ui/ToastIcon';
import type { PageLayoutProps } from '@/types';


/** 通知进出场动画（样式见 styles/components/toast.css），替换默认的 Bounce */
const ToastFade = cssTransition({ enter: 'toast-enter', exit: 'toast-exit', collapseDuration: 200 });

/** 页脚的社区链接 */
const FOOTER_LINKS = [
  { href: 'https://github.com/TeamMajdata/MajdataNet', label: 'GitHub', Icon: FaGithub },
  { href: 'https://discord.gg/AcWgZN7j6K', label: 'Discord', Icon: FaDiscord },
  { href: 'https://qun.qq.com/universal-share/share?ac=1&authKey=2m%2BXMJ2NrjiomE9CYBVp6ys1K9SjAJ3kl%2B3OCfVEff4ffLj3Z%2BYXJIBXbWJrdGvJ&busi_data=eyJncm91cENvZGUiOiI2Njc2NDQzMzgiLCJ0b2tlbiI6IjV0VTk1STl1Ti9RbmhvR0lHdVdySVVpR09DWFk3Y1JGelY0Qlg2YWFmYkxjYlhWZzZraDFUWTlyNHI5N243cG8iLCJ1aW4iOiIxMzIzMjkxMDk0In0%3D&data=oyLVI6BKjGNDg5-SEEe1Qw_DjQ3EnQSayTWrGQBDgGTxOw0_YffoTI_g4KQ3cJLbkkwkmzUxY3cWDqnRk-NTyw&svctype=4&tempid=h5_group_info', label: 'QQ', Icon: FaQq },
] as const;

export default function PageLayout({
  children,
  showFooter = true,
  showBackToHome = true,
  title = null,
  className = '',
  useAmbientBackground = true,
}: PageLayoutProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Background */}
      {useAmbientBackground ? (
        <AmbientBackground />
      ) : (
        <div className="z-[-99] fixed bg-cover bg-center blur-sm brightness-30 w-full h-full"></div>
      )}

      {/* Unified Header */}
      <UnifiedHeader />

      {/* Page Title */}
      {title && (
        <section className="mx-auto mt-(--content-top-spacing) mb-0 px-3 sm:px-4 max-w-7xl">
          <motion.div
            className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md p-4 sm:p-6 md:p-8 border border-white/10 rounded-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <h1
              className="m-0 font-bold text-[#e5e5e5] text-2xl sm:text-3xl md:text-[2.5rem] leading-tight"
              style={{
                textShadow: '0 0 2px #a78bfa, 0 0 4px #60a5fa'
              }}
            >
              {title}
            </h1>
          </motion.div>
        </section>
      )}

      {/* Main Content */}
      <main className={`mx-auto mt-3 sm:mt-4 px-3 sm:px-4 w-full max-w-7xl min-w-0 ${className}`}>{children}</main>

      {/* Back to Home Section */}
      {showBackToHome && (
        <section className="my-10 sm:my-16 pt-6 sm:pt-8 border-white/10 border-t text-center">
          <div className="mx-auto px-4 max-w-7xl">
            <Link to="/" className="no-underline">
              <div className="inline-flex justify-center items-center bg-[rgba(25,25,30,0.9)] hover:bg-[rgba(35,35,40,0.95)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] px-6 sm:px-8 py-3 sm:py-4 border border-white/10 hover:border-white/20 rounded-xl min-h-11 font-semibold text-[#e5e5e5] transition-all hover:-translate-y-0.5 duration-300">
                {t("shared/PageLayout.BackToHome")}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      {showFooter && (
        <footer className="mt-12 sm:mt-16 px-4 sm:px-6 pt-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] border-white/[0.07] border-t">
          {/* 居中排版：左下角固定的 Live2D 看板娘不会挡住内容 */}
          <div className="mx-auto max-w-350">
            <div className="flex flex-col items-center gap-5">
              <div className="flex md:flex-row flex-col items-center gap-3 md:text-left text-center">
                <img className="rounded-lg ring-1 ring-white/15 w-9 h-9" src="/salt.webp" alt="" aria-hidden="true" loading="lazy" />
                <div>
                  <div className="font-semibold text-white text-base tracking-tight">
                    Majdata<span className="text-blue-300">.Net</span>
                  </div>
                  <div className="text-white/50 text-sm">{t("shared/PageLayout.FooterCommunity")}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {FOOTER_LINKS.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="place-items-center grid bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl w-10 h-10 text-white/60 hover:text-white transition-colors"
                  >
                    <Icon aria-hidden="true" className="w-[18px] h-[18px]" />
                  </a>
                ))}
                <Link
                  to="/minigame"
                  title={t("shared/PageLayout.MiniGame")}
                  className="group flex items-center gap-2 bg-white/[0.04] hover:bg-white/10 ml-1 pr-3 pl-1 border border-white/10 hover:border-white/20 rounded-xl h-10 text-white/60 hover:text-white text-sm no-underline transition-colors"
                >
                  <img className="rounded-lg w-8 h-8 object-cover group-hover:rotate-6 transition-transform" loading="lazy" src="/bee.webp" alt="" aria-hidden="true" />
                  {t("shared/PageLayout.MiniGame")}
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-6 pt-5 border-white/[0.06] border-t max-w-xl text-white/35 text-xs text-center">
              {t("shared/PageLayout.FooterCopyright")}
            </div>
          </div>
        </footer>
      )}

      {/* Floating Buttons */}
      <FloatingButtons />

      {/* Toast Container */}
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        icon={ToastIcon}
        closeButton={false}
        transition={ToastFade}
      />
    </>
  );
}
