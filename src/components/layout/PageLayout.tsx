import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import { loc } from "@/utils";
import { UnifiedHeader } from "@/components";
import AmbientBackground from "./AmbientBackground";
import FloatingButtons from "./FloatingButtons";
import type { PageLayoutProps } from "@/types";

export default function PageLayout({
  children,
  showFooter = true,
  showBackToHome = false,
  title = null,
  className = "",
  useAmbientBackground = false,
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
          <motion.div
            className="bg-white/80 shadow-2xl backdrop-blur-md p-8 border border-black/8 rounded-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <h1
              className="m-0 font-bold text-gray-700 text-[2.5rem]"
              style={{
                textShadow:
                  "0 0 2px rgba(92,141,193,0.3), 0 0 4px rgba(92,141,193,0.2)",
              }}
            >
              {title}
            </h1>
          </motion.div>
        </section>
      )}

      {/* Main Content */}
      <main className={`mx-auto mt-4 px-4 ${className}`}>{children}</main>

      {/* Back to Home Section */}
      {showBackToHome && (
        <section className="my-16 pt-8 border-black/8 border-t text-center">
          <div className="mx-auto px-4 max-w-7xl">
            <Link to="/" className="no-underline">
              <div className="inline-block bg-white/80 hover:bg-white/95 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05)] px-8 py-4 border border-black/8 hover:border-[#5C8DC1]/20 rounded-xl font-semibold text-gray-700 transition-all hover:-translate-y-0.5 duration-300">
                {loc("BackToHome")}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      {showFooter && (
        <footer className="mt-16 px-4 pt-12 pb-16 text-center">
          {/* Footer Content */}
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Copyright */}
            <div className="font-semibold text-gray-700 text-sm text-center">
              {loc("FooterCopyright")}
            </div>

            {/* Open Source Info */}
            <div className="text-[0.85rem] text-gray-600 text-center">
              <a
                href="https://github.com/TeamMajdata/MajdataNet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5C8DC1] hover:text-[#4A7DAF] no-underline transition-all duration-300"
                style={{
                  textShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow =
                    "0 0 8px rgba(92, 141, 193, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = "none";
                }}
              >
                GitHub
              </a>
              {" | "}
              <a
                href="https://discord.gg/AcWgZN7j6K"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5C8DC1] hover:text-[#4A7DAF] no-underline transition-all duration-300"
                style={{
                  textShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow =
                    "0 0 8px rgba(92, 141, 193, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = "none";
                }}
              >
                Discord
              </a>
              {" | "}
              <a
                href="https://qun.qq.com/universal-share/share?ac=1&authKey=2m%2BXMJ2NrjiomE9CYBVp6ys1K9SjAJ3kl%2B3OCfVEff4ffLj3Z%2BYXJIBXbWJrdGvJ&busi_data=eyJncm91cENvZGUiOiI2Njc2NDQzMzgiLCJ0b2tlbiI6IjV0VTk1STl1Ti9RbmhvR0lHdVdySVVpR09DWFk3Y1JGelY0Qlg2YWFmYkxjYlhWZzZraDFUWTlyNHI5N243cG8iLCJ1aW4iOiIxMzIzMjkxMDk0In0%3D&data=oyLVI6BKjGNDg5-SEEe1Qw_DjQ3EnQSayTWrGQBDgGTxOw0_YffoTI_g4KQ3cJLbkkwkmzUxY3cWDqnRk-NTyw&svctype=4&tempid=h5_group_info"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5C8DC1] hover:text-[#4A7DAF] no-underline transition-all duration-300"
                style={{
                  textShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow =
                    "0 0 8px rgba(92, 141, 193, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = "none";
                }}
              >
                QQ
              </a>
            </div>

            {/* Community */}
            <div className="text-gray-500 text-xs text-center italic">
              {loc("FooterCommunity")}
            </div>
          </div>

          {/* Mini Game Link */}
          <Link
            to="/minigame"
            className="group inline-block relative mt-8 hover:rotate-2 hover:scale-110 transition-all duration-300"
          >
            <img
              className="group-hover:shadow-[0_8px_20px_rgba(92,141,193,0.3)] rounded-xl w-30 h-auto transition-all duration-300"
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
