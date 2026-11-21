import { useLogoEasterEgg } from './useLogoEasterEgg';

/**
 * Majdata.Net Logo 组件
 * 点击头像会显示彩蛋提示；`compact` 用在手机端顶栏中间：屏幕太窄放不下时只显示头像
 */
export default function MajdataLogo({ compact = false }: { compact?: boolean }) {
  const handleClick = useLogoEasterEgg();

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
