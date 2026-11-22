import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const LOGO_TOAST_ID = 'logo-easter-egg';

/** 点 xxlb 头像的彩蛋（“不要点我”）：顶栏 Logo 和页脚头像共用 */
export function useLogoEasterEgg() {
  const { t } = useTranslation();
  return () => {
    // 原来只停 500ms，进场动画刚播完就没了，手机上像是点了没反应；
    // 固定 toastId：连点时不会叠一串，只是重新计时
    if (toast.isActive(LOGO_TOAST_ID)) {
      toast.update(LOGO_TOAST_ID, { autoClose: 1500 });
      return;
    }
    toast.error(t("shared/MajdataLogo.FUCKYOU"), {
      toastId: LOGO_TOAST_ID,
      position: 'top-center',
      autoClose: 1500,
    });
  };
}
