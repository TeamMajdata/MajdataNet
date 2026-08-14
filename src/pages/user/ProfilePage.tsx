import { PageLayout, AvatarUploader, IntroUploader } from '@/components';
import { useLoc } from '@/hooks';
import { motion, type Variants } from 'framer-motion';
import { Image as ImageIcon, FileText } from 'lucide-react';

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
      {/* 单栏布局：头像设置 + 个人简介，一行一张 */}
      <motion.div
        initial="hidden"
        animate="visible"
        custom={0.3}
        variants={slideInUp}
      >
        <div className="gap-6 flex flex-col mx-auto my-0 w-full max-w-5xl">
          {/* Avatar Settings Card */}
          <div className="bg-surface border border-line rounded-xl shadow-card hover:shadow-card-hover px-6 md:px-8 py-6 md:py-8 transition-all hover:-translate-y-0.5 duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-line border-b">
              <div className="bg-primary-soft p-2 rounded-md">
                <ImageIcon className="text-primary text-xl" />
              </div>
              <div className="font-semibold text-ink text-xl">
                {loc('AvatarSettings')}
              </div>
              <span className="text-ink-3 text-xs font-normal ml-auto">
                {loc('AvatarHint')}
              </span>
            </div>
            <AvatarUploader />
          </div>

          {/* Personal Introduction Card */}
          <div className="bg-surface border border-line rounded-xl shadow-card hover:shadow-card-hover px-6 md:px-8 py-6 md:py-8 transition-all hover:-translate-y-0.5 duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-line border-b">
              <div className="bg-primary-soft p-2 rounded-md">
                <FileText className="text-primary text-xl" />
              </div>
              <div className="font-semibold text-ink text-xl">
                {loc('PersonalIntro')}
              </div>
            </div>
            <IntroUploader />
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}
