import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

/** 点 xxlb 头像的彩蛋（“不要点我”）：顶栏 Logo 和页脚头像共用 */
export function useLogoEasterEgg() {
  const { t } = useTranslation();
  return () => {
    toast.error(t("shared/MajdataLogo.FUCKYOU"), {
      position: 'top-center',
      autoClose: 500,
    });
  };
}
