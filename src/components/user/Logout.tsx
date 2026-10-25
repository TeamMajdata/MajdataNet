import { useNavigate } from 'react-router-dom';
import { handleLogout as logoutUtil } from '@/utils';
import { useI18n } from '@/hooks';

/**
 * 登出组件
 * 处理用户登出逻辑
 */
export default function Logout() {
  const { i18n } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUtil(
      () => navigate('/login'), // 登出成功，跳转到登录页
      (error) => {
        console.error('登出失败:', error);
        navigate('/login'); // 即使失败也跳转到登录页
      }
    );
  };

  return (
    <div className="hover:bg-[rgb(46,46,46)] hover:shadow-[2px_2px_5px_gray] m-[10px] p-[5px] border border-transparent hover:border-[whitesmoke] rounded-[10px] text-[gainsboro] hover:text-white transition-all duration-200" onClick={handleLogout}>
      {i18n("user/Logout.Logout")}
    </div>
  );
}
