import { PageLayout, AvatarUploader, IntroUploader } from '@/components';
import { useLoc } from '@/hooks';
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

  return (
    <PageLayout title={loc('AccountSetting')} showBackToHome={false}>
      {/* Profile Settings */}
      <motion.div
        initial="hidden"
        animate="visible"
        custom={0.3}
        variants={slideInUp}
      >
        <div className="flex flex-col gap-8 mx-auto my-0 w-full">
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
