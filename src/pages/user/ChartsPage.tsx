import { PageLayout, ChartUploader, SongList, LoadingSpinner } from '@/components';
import { useLoc, useUserContext } from '@/hooks';
import { endpoints } from '@/config/api';
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

export default function UserChartsPage() {
  const loc = useLoc();
  const { user, isLoading } = useUserContext();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;
  }

  if (!user) {
    return (
      <PageLayout title={loc('ChartsManagement')} showBackToHome={true}>
        <div className="py-16 text-white/70 text-center">
          {loc('PleaseLogin', '请先登录')}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={loc('ChartsManagement')} showBackToHome={false}>
      {/* Upload Section */}
      <section className="mb-16">
        <motion.div
          className="bg-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md p-8 border border-white/10 rounded-2xl"
          initial="hidden"
          animate="visible"
          custom={0.3}
          variants={slideInUp}
        >
          <div className="mb-8">
            <h2 className="m-0 mb-6 font-semibold text-[#e5e5e5] text-[1.8rem] text-center">
              {loc('UploadChart')}
            </h2>

            {/* Notice Board */}
            <div className="relative bg-linear-to-br from-[rgba(59,130,246,0.15)] via-[rgba(59,130,246,0.1)] to-[rgba(99,102,241,0.1)] shadow-[0_0_30px_rgba(59,130,246,0.2),inset_0_0_20px_rgba(59,130,246,0.05)] mb-8 p-8 border-[rgba(59,130,246,0.4)] border-2 rounded-2xl overflow-hidden">
              {/* Decorative corner pins */}
              <div className="top-3 left-3 absolute bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full w-3 h-3"></div>
              <div className="top-3 right-3 absolute bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full w-3 h-3"></div>
              <div className="bottom-3 left-3 absolute bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full w-3 h-3"></div>
              <div className="right-3 bottom-3 absolute bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full w-3 h-3"></div>

              {/* Header with icon */}
              <div className="flex justify-center items-center gap-3 mb-6 pb-4 border-[rgba(59,130,246,0.3)] border-b-2">
                <div className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] text-4xl"></div>
                <h3 className="drop-shadow-[0_2px_8px_rgba(59,130,246,0.4)] m-0 font-bold text-[#60a5fa] text-3xl">
                  {loc('UploadNotice')}
                </h3>
              </div>

              {/* Notice content */}
              <ol className="space-y-3 m-0 pl-8 text-[#e5e5e5] list-decimal">
                <li className="pl-2 marker:font-bold marker:text-[#60a5fa] text-base leading-relaxed">
                  <span className="inline-block bg-[rgba(59,130,246,0.1)] px-2 py-1 rounded">
                    {loc('UploadNoticeTerms1')}
                  </span>
                </li>
                <li className="pl-2 marker:font-bold marker:text-[#60a5fa] text-base leading-relaxed">
                  <span className="inline-block bg-[rgba(59,130,246,0.1)] px-2 py-1 rounded">
                    {loc('UploadNoticeTerms2')}
                  </span>
                </li>
                <li className="pl-2 marker:font-bold marker:text-[#60a5fa] text-base leading-relaxed">
                  <span className="inline-block bg-[rgba(59,130,246,0.1)] px-2 py-1 rounded">
                    {loc('UploadNoticeTerms3')}
                  </span>
                </li>
                <li className="pl-2 marker:font-bold marker:text-[#60a5fa] text-base leading-relaxed">
                  <span className="inline-block bg-[rgba(59,130,246,0.1)] px-2 py-1 rounded">
                    {loc('UploadNoticeTerms4')}
                  </span>
                </li>
              </ol>

              {/* Bottom accent line */}
              <div className="mt-6 pt-4 border-[rgba(59,130,246,0.2)] border-t">
                <div className="flex justify-center items-center gap-2 opacity-80 text-[#60a5fa] text-sm">
                  <span className="font-semibold">请仔细阅读以上条款</span>
                </div>
              </div>
            </div>
          </div>
          <ChartUploader />
        </motion.div>
      </section>

      {/* Charts Management Section */}
      <motion.section
        className="bg-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md p-8 border border-white/10 rounded-2xl"
        initial="hidden"
        animate="visible"
        custom={0.5}
        variants={slideInUp}
      >
        <div className="mb-8 pb-4 border-white/10 border-b text-center">
          <h2 className="m-0 mb-2 font-semibold text-[#e5e5e5] text-[1.8rem]">
            {loc('MyCharts')}
          </h2>
          <p className="m-0 text-[#a0a0a0] text-base">
            {loc('ManageAllYourCharts')}
          </p>
        </div>
        <SongList
          url={endpoints.maichart.listSearch('uploader:' + user.username)}
          isManage={true}
        />
      </motion.section>
    </PageLayout>
  );
}
