import { Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { loc } from '@/utils';
import { UnifiedHeader } from '@/components';
import AmbientBackground from './AmbientBackground';
import FloatingButtons from './FloatingButtons';
import type { PageLayoutProps } from '@/types';


export default function PageLayout({
  children,
  showFooter = true,
  showBackToHome = true,
  title = null,
  className = '',
  useAmbientBackground = true,
}: PageLayoutProps) {
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
                {loc('BackToHome')}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      {showFooter && (
        <footer className="bg-linear-to-b from-[rgba(20,20,20,0.3)] to-[rgba(10,10,10,0.3)] backdrop-blur-[10px] mt-12 sm:mt-16 px-4 pt-10 sm:pt-12 pb-[calc(4rem+env(safe-area-inset-bottom))] border-white/10 border-t text-center">
          {/* Footer Content */}
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Copyright */}
            <div className="font-semibold text-white/90 text-sm text-center">
              {loc('FooterCopyright')}
            </div>

            {/* Open Source Info */}
            <div className="text-[0.85rem] text-white/80 text-center">
              <a
                href="https://github.com/TeamMajdata/MajdataNet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400/90 hover:text-blue-400 no-underline transition-all duration-300"
                style={{
                  textShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow = '0 0 8px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = 'none';
                }}
              >
                GitHub
              </a>
              {' | '}
              <a
                href="https://discord.gg/AcWgZN7j6K"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400/90 hover:text-blue-400 no-underline transition-all duration-300"
                style={{
                  textShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow = '0 0 8px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = 'none';
                }}
              >
                Discord
              </a>
              {' | '}
              <a
                href="https://qun.qq.com/universal-share/share?ac=1&authKey=2m%2BXMJ2NrjiomE9CYBVp6ys1K9SjAJ3kl%2B3OCfVEff4ffLj3Z%2BYXJIBXbWJrdGvJ&busi_data=eyJncm91cENvZGUiOiI2Njc2NDQzMzgiLCJ0b2tlbiI6IjV0VTk1STl1Ti9RbmhvR0lHdVdySVVpR09DWFk3Y1JGelY0Qlg2YWFmYkxjYlhWZzZraDFUWTlyNHI5N243cG8iLCJ1aW4iOiIxMzIzMjkxMDk0In0%3D&data=oyLVI6BKjGNDg5-SEEe1Qw_DjQ3EnQSayTWrGQBDgGTxOw0_YffoTI_g4KQ3cJLbkkwkmzUxY3cWDqnRk-NTyw&svctype=4&tempid=h5_group_info"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400/90 hover:text-blue-400 no-underline transition-all duration-300"
                style={{
                  textShadow: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow = '0 0 8px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = 'none';
                }}
              >
                QQ
              </a>
            </div>

            {/* Community */}
            <div className="text-white/70 text-xs text-center italic">
              {loc('FooterCommunity')}
            </div>
          </div>

          {/* Mini Game Link */}
          <Link
            to="/minigame"
            className="group inline-block relative mt-8 hover:rotate-2 hover:scale-110 transition-all duration-300"
          >
            <img
              className="group-hover:shadow-[0_8px_20px_rgba(59,130,246,0.3)] rounded-xl w-30 h-auto transition-all duration-300"
              loading="lazy"
              src="/bee.webp"
              alt={loc('MiniGame')}
            />
          </Link>
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
      />
    </>
  );
}
