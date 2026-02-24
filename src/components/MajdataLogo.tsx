import { toast } from 'react-toastify';
import { loc } from '@/utils/i18n';

/**
 * Majdata.Net Logo 组件
 * 点击会显示彩蛋提示
 */
export default function MajdataLogo() {
  const handleClick = () => {
    toast.error(loc('FUCKYOU', 'FUCK YOU'), {
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
