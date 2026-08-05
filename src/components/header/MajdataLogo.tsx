import { toast } from 'react-toastify';
import { useI18n } from '@/hooks';

/**
 * Majdata.Net Logo 组件
 * 点击会显示彩蛋提示
 */
export default function MajdataLogo() {
  const { i18n } = useI18n();
  
  const handleClick = () => {
    toast.error(i18n("shared/MajdataLogo.FUCKYOU", 'FUCK YOU'), {
      position: 'top-center',
      autoClose: 500,
    });
  };

  return (
    <h1 style={{ fontFamily: 'fantasy' }}>
      <img
        className='inline m-2.5 rounded h-12.5'
        src="../../../salt.webp"
        onClick={handleClick}
        alt="xxlb"
      />
      Majdata.Net
    </h1>
  );
}
