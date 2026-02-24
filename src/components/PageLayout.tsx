import { Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { loc } from '@/utils';
import AmbientBackground from './AmbientBackground';
import AdComponent from './AdComponent';
import FloatingButtons from './FloatingButtons';
import UnifiedHeader from './UnifiedHeader';
import type { PageLayoutProps } from '@/types';


/**
 * 页面布局组件
 * 提供统一的页面结构：背景、头部导航、标题、内容、页脚等
 */
export default function PageLayout({
  children,
  showAds = true,
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
        <section className="max-w-7xl mx-auto mt-(--content-top-spacing) mb-0 px-4">
          <div 
            className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md p-8 border border-white/10 rounded-2xl text-center"
            style={{
              animation: 'slideInUp 0.6s ease-out 0.2s both'
            }}
          >
            <h1 
              className="m-0 font-bold text-[#e5e5e5] text-[2.5rem]"
              style={{
                textShadow: '0 0 2px #a78bfa, 0 0 4px #60a5fa'
              }}
            >
              {title}
            </h1>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto mt-4 px-4 ${className}`}>{children}</main>

      {/* Back to Home Section */}
      {showBackToHome && (
        <section className="my-16 pt-8 border-white/10 border-t text-center">
          <div className="mx-auto px-4 max-w-7xl">
            <Link to="/" className="no-underline">
              <div className="inline-block bg-[rgba(25,25,30,0.9)] hover:bg-[rgba(35,35,40,0.95)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] px-8 py-4 border border-white/10 hover:border-white/20 rounded-xl font-semibold text-[#e5e5e5] transition-all hover:-translate-y-0.5 duration-300">
                {loc('BackToHome')}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      {showFooter && (
        <footer className="bg-linear-to-b from-[rgba(20,20,20,0.3)] to-[rgba(10,10,10,0.3)] backdrop-blur-[10px] mt-16 px-4 pt-12 pb-16 border-white/10 border-t text-center">
          {showAds && (
            <>
              <script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7973799234411834"
                crossOrigin="anonymous"
              />
              <AdComponent />
            </>
          )}

          {/* Footer Content */}
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Copyright */}
            <div className="font-semibold text-white/90 text-sm text-center">
              {loc('FooterCopyright')}
            </div>

            {/* Open Source Info */}
            <div className="text-[0.85rem] text-white/80 text-center">
              <a
                href="https://github.com/LingFeng-bbben/Majdata-Online"
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
                {loc('FooterOpenSource')}
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
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
