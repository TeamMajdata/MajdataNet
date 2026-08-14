import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import { loc } from "@/utils";
import { UnifiedHeader } from "@/components";
import FloatingButtons from "./FloatingButtons";
import type { PageLayoutProps } from "@/types";

export default function PageLayout({
  children,
  showFooter = true,
  showBackToHome = false,
  title = null,
  className = "",
}: PageLayoutProps) {
  return (
    <>
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Page Title */}
      {title && (
        <section className="w-full mt-(--content-top-spacing) mb-0 px-4">
          <motion.div
            className="p-4 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          >
            <h1 className="m-0 font-bold text-ink text-[2rem]">
              {title}
            </h1>
          </motion.div>
        </section>
      )}

      {/* Main Content（全宽，去掉左右限宽留白） */}
      <main className={`w-full mt-4 px-4 ${className}`}>
        {children}
      </main>

      {/* Back to Home Section */}
      {showBackToHome && (
        <section className="my-16 pt-8 border-line border-t text-center">
          <div className="px-4">
            <Link to="/" className="no-underline">
              <div className="inline-block bg-surface hover:bg-primary-soft px-8 py-4 border border-line hover:border-primary/40 rounded-xl font-semibold text-ink-2 hover:text-primary transition-colors duration-200">
                {loc("BackToHome")}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      {showFooter && (
        <footer className="bg-surface border-line border-t mt-16 px-4 pt-16 pb-20 text-center">
          {/* Footer Content */}
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Copyright */}
            <div className="font-semibold text-ink-2 text-sm text-center">
              {loc("FooterCopyright")}
            </div>

            {/* Open Source Info */}
            <div className="text-[0.85rem] text-ink-2 text-center">
              <a
                href="https://github.com/TeamMajdata/MajdataNet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover no-underline transition-colors duration-200"
              >
                GitHub
              </a>
              {" | "}
              <a
                href="https://discord.gg/AcWgZN7j6K"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover no-underline transition-colors duration-200"
              >
                Discord
              </a>
              {" | "}
              <a
                href="https://qun.qq.com/universal-share/share?ac=1&authKey=2m%2BXMJ2NrjiomE9CYBVp6ys1K9SjAJ3kl%2B3OCfVEff4ffLj3Z%2BYXJIBXbWJrdGvJ&busi_data=eyJncm91cENvZGUiOiI2Njc2NDQzMzgiLCJ0b2tlbiI6IjV0VTk1STl1Ti9RbmhvR0lHdVdySVVpR09DWFk3Y1JGelY0Qlg2YWFmYkxjYlhWZzZraDFUWTlyNHI5N243cG8iLCJ1aW4iOiIxMzIzMjkxMDk0In0%3D&data=oyLVI6BKjGNDg5-SEEe1Qw_DjQ3EnQSayTWrGQBDgGTxOw0_YffoTI_g4KQ3cJLbkkwkmzUxY3cWDqnRk-NTyw&svctype=4&tempid=h5_group_info"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover no-underline transition-colors duration-200"
              >
                QQ
              </a>
            </div>

            {/* Community */}
            <div className="text-ink-3 text-xs text-center italic">
              {loc("FooterCommunity")}
            </div>
          </div>

          {/* Mini Game Link */}
          <Link
            to="/minigame"
            className="group inline-block relative mt-8 hover:-translate-y-0.5 transition-transform duration-200"
          >
            <img
              className="rounded-xl w-30 h-auto border border-line"
              loading="lazy"
              src="/bee.webp"
              alt={loc("MiniGame")}
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
        theme="light"
      />
    </>
  );
}
