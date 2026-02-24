/**
 * UserProfilePage - 个人设置页面
 * 迁移自 legacy/src/app/user/profile/page.jsx
 */

import { Link } from 'react-router-dom';
import { PageLayout, AvatarUploader, IntroUploader } from '@/components';
import { useLoc, useUser } from '@/hooks';
import { motion, type Variants } from 'framer-motion';

// slideInUp 动画变体
const slideInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] as const,
      delay,
    },
  }),
};

export default function UserProfilePage() {
  const loc = useLoc();
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-[50px] h-[50px] animate-[spin_0.1s_linear_infinite]"></div>;
  }

  if (!user) {
    return (
      <PageLayout title={loc('AccountSetting')} showBackToHome={true}>
        <div className="py-16 text-white/70 text-center">
          {loc('PleaseLogin', '请先登录')}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={loc('AccountSetting')} showBackToHome={false}>
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/user"
          className="inline-block bg-[rgba(30,30,30,0.9)] hover:bg-[rgba(40,40,40,0.95)] px-6 py-2 border border-white/10 hover:border-[rgba(59,130,246,0.5)] rounded-lg text-white/90 no-underline transition-all duration-300"
        >
          ← {loc('Back')}
        </Link>
      </div>

      {/* Profile Settings */}
      <motion.div 
        initial="hidden"
        animate="visible"
        custom={0.3}
        variants={slideInUp}
      >
        <div className="flex flex-col gap-8 max-w-(--container-max-width) mx-auto my-0 px-(--container-padding)">
          {/* Avatar Settings Card */}
          <div className="bg-[rgba(30,30,30,0.9)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] backdrop-blur-[10px] px-10 py-10 border border-white/10 hover:border-[rgba(59,130,246,0.5)] rounded-2xl min-h-50 transition-all hover:-translate-y-0.5 duration-300">
            <div className="flex items-center gap-4 mb-6 pb-4 border-white/10 border-b">
              <div className="font-semibold text-[#e5e5e5] text-xl">
                {loc('AvatarSettings')} ({loc('AvatarHint')})
              </div>
            </div>
            <div className="min-h-37.5">
              <AvatarUploader />
            </div>
          </div>

          {/* Personal Introduction Card */}
          <div className="bg-[rgba(30,30,30,0.9)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] backdrop-blur-[10px] px-10 py-10 border border-white/10 hover:border-[rgba(59,130,246,0.5)] rounded-2xl min-h-50 transition-all hover:-translate-y-0.5 duration-300">
            <div className="flex items-center gap-4 mb-6 pb-4 border-white/10 border-b">
              <div className="font-semibold text-[#e5e5e5] text-xl">
                {loc('PersonalIntro')}
              </div>
            </div>
            <div className="min-h-37.5">
              <IntroUploader />
            </div>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}
