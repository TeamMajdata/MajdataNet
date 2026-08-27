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
  if (isLoading && !user ) {
      return (
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner size="50px" />
        </div>
      );
  }
  
  return (
    <PageLayout title={loc('ChartsManagement')} showBackToHome={false}>
      {/* Upload Section */}
      <section className="mb-16">
        <motion.div
          className="p-6 md:p-8 rounded-xl"
          initial="hidden"
          animate="visible"
          custom={0.3}
          variants={slideInUp}
        >
          <div className="mb-8">
            <h2 className="m-0 mb-6 font-semibold text-ink text-[1.8rem] text-center">
              {loc('UploadChart')}
            </h2>

            {/* Notice Board */}
            <div className="bg-primary-soft border border-primary/30 mb-8 p-6 md:p-8 rounded-xl">
              {/* Header with icon */}
              <div className="flex justify-center items-center gap-3 mb-6 pb-4 border-primary/20 border-b-2">
                <div className="text-4xl"></div>
                <h3 className="m-0 font-bold text-primary text-2xl">
                  {loc('UploadNotice')}
                </h3>
              </div>

              {/* Notice content */}
              <ol className="space-y-3 m-0 pl-8 text-ink list-decimal">
                <li className="pl-2 marker:font-bold marker:text-primary text-base leading-relaxed">
                  <span className="inline-block bg-surface px-2 py-1 rounded">
                    {loc('UploadNoticeTerms1')}
                  </span>
                </li>
                <li className="pl-2 marker:font-bold marker:text-primary text-base leading-relaxed">
                  <span className="inline-block bg-surface px-2 py-1 rounded">
                    {loc('UploadNoticeTerms2')}
                  </span>
                </li>
                <li className="pl-2 marker:font-bold marker:text-primary text-base leading-relaxed">
                  <span className="inline-block bg-surface px-2 py-1 rounded">
                    {loc('UploadNoticeTerms3')}
                  </span>
                </li>
                <li className="pl-2 marker:font-bold marker:text-primary text-base leading-relaxed">
                  <span className="inline-block bg-surface px-2 py-1 rounded">
                    {loc('UploadNoticeTerms4')}
                  </span>
                </li>
              </ol>

              {/* Bottom accent line */}
              <div className="mt-6 pt-4 border-primary/20 border-t">
                <div className="flex justify-center items-center gap-2 text-primary text-sm">
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
        className="p-6 md:p-8 rounded-xl"
        initial="hidden"
        animate="visible"
        custom={0.5}
        variants={slideInUp}
      >
        <div className="mb-8 pb-4 border-line border-b text-center">
          <h2 className="m-0 mb-2 font-semibold text-ink text-[1.8rem]">
            {loc('MyCharts')}
          </h2>
          <p className="m-0 text-ink-2 text-base">
            {loc('ManageAllYourCharts')}
          </p>
        </div>
        <SongList
          url={endpoints.maichart.listSearch('uploader:' + user?.username)}
          isManage={true}
        />
      </motion.section>
    </PageLayout>
  );
}
