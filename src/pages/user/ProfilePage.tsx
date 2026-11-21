import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { PageLayout, AvatarUploader, IntroUploader } from '@/components';
import NicknameEditor from '@/components/user/NicknameEditor';

/** 设置分组卡片：标题和说明在上，内容在下 */
function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="bg-white/[0.03] p-5 sm:p-6 border border-white/10 rounded-2xl min-w-0">
      <header className="mb-5">
        <h2 className="m-0 font-semibold text-white! text-lg! text-left!">{title}</h2>
        {description && <p className="m-0 mt-1 text-white/50! text-sm">{description}</p>}
      </header>
      {/* 包一层，让设置项的 first:/last: 只在设置项之间生效 */}
      <div>{children}</div>
    </section>
  );
}

/** 设置项：桌面端标签在左、控件在右，手机端上下排列 */
function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="items-start gap-3 sm:gap-6 grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] py-5 first:pt-0 last:pb-0 border-white/[0.06] border-t first:border-t-0">
      <div>
        <div className="font-medium text-white/90 text-sm">{label}</div>
        {hint && <div className="mt-0.5 text-white/45 text-xs">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function UserProfilePage() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        <header className="mb-5 sm:mb-6">
          <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
            {t("user/profile/ProfilePage.AccountSetting")}
          </h1>
        </header>

        <motion.div
          className="flex flex-col gap-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <SettingsCard title={t("user/profile/ProfilePage.BasicInfo")}>
            <SettingRow label={t("user/profile/ProfilePage.Avatar")} hint={t("user/profile/ProfilePage.AvatarHint")}>
              <AvatarUploader />
            </SettingRow>
            <SettingRow label={t("auth/AuthModal.Nickname")}>
              <NicknameEditor />
            </SettingRow>
          </SettingsCard>

          <SettingsCard title={t("user/profile/ProfilePage.PersonalIntro")} description={t("user/profile/ProfilePage.IntroHint")}>
            <IntroUploader />
          </SettingsCard>
        </motion.div>
      </div>
    </PageLayout>
  );
}
