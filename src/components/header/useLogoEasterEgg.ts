import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

/**
 * 点 xxlb 头像的彩蛋（“不要点我”）：顶栏 Logo 和页脚头像共用。
 * 连点就一条条叠起来（彩蛋就是要能点出一大堆）；每条停 1.5 秒，太短的话手机上进场动画刚播完就没了。
 */
export function useLogoEasterEgg() {
  const { t } = useTranslation();
  return () => {
    toast.error(t("shared/MajdataLogo.FUCKYOU"), {
      position: 'top-center',
      autoClose: 1500,
    });
  };
}
