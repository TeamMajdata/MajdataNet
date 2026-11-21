import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

/**
 * Majdata.Net Logo 组件
 * 点击头像会显示彩蛋提示；`compact` 用在手机端顶栏中间：屏幕太窄放不下时只显示头像
 */
export default function MajdataLogo({ compact = false }: { compact?: boolean }) {
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
        alt={compact ? 'Majdata.Net' : 'xxlb'}
      />
      <span className={`font-semibold text-[1.05rem] text-white tracking-tight ${compact ? 'hidden min-[22.5rem]:inline' : ''}`}>
        Majdata<span className="text-blue-300">.Net</span>
      </span>
    </span>
  );
}
