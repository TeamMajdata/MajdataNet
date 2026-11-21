import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

/**
 * Majdata.Net Logo 组件
 * 点击头像会显示彩蛋提示
 */
export default function MajdataLogo() {
  const { t } = useTranslation();

  const handleClick = () => {
    toast.error(t("shared/MajdataLogo.FUCKYOU"), {
      position: 'top-center',
      autoClose: 500,
    });
  };

  return (
    <span className="flex items-center gap-2.5">
      <img
        className="rounded-lg ring-1 ring-white/15 w-8 h-8 object-cover"
        src="/salt.webp"
        onClick={handleClick}
        alt="xxlb"
      />
      <span className="font-semibold text-[1.05rem] text-white tracking-tight">
        Majdata<span className="text-blue-300">.Net</span>
      </span>
    </span>
  );
}
