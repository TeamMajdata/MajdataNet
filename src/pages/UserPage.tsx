/**
 * UserPage - 用户中心页面
 * 迁移自 legacy/src/app/user/page.jsx
 */

import { Link } from 'react-router-dom';
import { PageLayout } from '@/components';
import { useLoc } from '@/hooks';

export default function UserPage() {
  const loc = useLoc();

  return (
    <PageLayout title={loc('UserCenter')} showBackToHome={true}>
      <div className="pb-8">
        <div className="mt-(--content-top-spacing) animate-[slideInUp_0.6s_ease-out_0.3s_both]">
          <div className="gap-8 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] mx-auto max-w-225">
            {/* Charts Management Card */}
            <Link
              to="/user/charts"
              className="flex items-center gap-6 bg-[rgba(30,30,30,0.9)] hover:bg-[rgba(40,40,40,0.95)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.3)] backdrop-blur-[10px] px-8 py-8 border border-white/10 hover:border-[rgba(59,130,246,0.5)] rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1 duration-300 cursor-pointer"
            >
              <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] min-w-16 text-5xl text-center">
                📊
              </div>
              <div className="flex-1">
                <h3 className="m-0 mb-2 font-semibold text-[#e5e5e5] text-[1.3rem]">
                  {loc('ChartsManagement')}
                </h3>
                <p className="m-0 text-[#a0a0a0] text-[0.9rem] leading-normal">
                  {loc('ManageYourCharts')}
                </p>
              </div>
              <div className="text-[#3b82f6] text-2xl transition-transform group-hover:translate-x-1 duration-300">
                →
              </div>
            </Link>

            {/* Account Settings Card */}
            <Link
              to="/user/profile"
              className="flex items-center gap-6 bg-[rgba(30,30,30,0.9)] hover:bg-[rgba(40,40,40,0.95)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.3)] backdrop-blur-[10px] px-8 py-8 border border-white/10 hover:border-[rgba(59,130,246,0.5)] rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1 duration-300 cursor-pointer"
            >
              <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] min-w-16 text-5xl text-center">
                ⚙️
              </div>
              <div className="flex-1">
                <h3 className="m-0 mb-2 font-semibold text-[#e5e5e5] text-[1.3rem]">
                  {loc('AccountSetting')}
                </h3>
                <p className="m-0 text-[#a0a0a0] text-[0.9rem] leading-normal">
                  {loc('ModifyPersonalInfo')}
                </p>
              </div>
              <div className="text-[#3b82f6] text-2xl transition-transform duration-300">
                →
              </div>
            </Link>

            {/* Personal Home Page Card */}
            <Link
              to="/space"
              className="flex items-center gap-6 bg-[rgba(30,30,30,0.9)] hover:bg-[rgba(40,40,40,0.95)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.3)] backdrop-blur-[10px] px-8 py-8 border border-white/10 hover:border-[rgba(59,130,246,0.5)] rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1 duration-300 cursor-pointer"
            >
              <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] min-w-16 text-5xl text-center">
                🏠
              </div>
              <div className="flex-1">
                <h3 className="m-0 mb-2 font-semibold text-[#e5e5e5] text-[1.3rem]">
                  {loc('PersonalHomePage')}
                </h3>
                <p className="m-0 text-[#a0a0a0] text-[0.9rem] leading-normal">
                  {loc('ViewYourHomePage')}
                </p>
              </div>
              <div className="text-[#3b82f6] text-2xl transition-transform duration-300">
                →
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .flex.items-center {
            padding: 1.5rem;
          }
          .text-5xl {
            font-size: 2.5rem;
            min-width: 3rem;
          }
          h3 {
            font-size: 1.1rem !important;
          }
        }
      `}</style>
    </PageLayout>
  );
}
