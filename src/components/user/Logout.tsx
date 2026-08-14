import { useNavigate } from 'react-router-dom';
import { handleLogout as logoutUtil } from '@/utils';
import { loc } from '@/utils';

/**
 * 登出组件
 * 处理用户登出逻辑
 */
export default function Logout() {
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
    <div className="hover:bg-surface-2 hover:text-danger m-[10px] p-[5px] border border-transparent hover:border-line rounded-[10px] text-ink-2 transition-colors duration-200 cursor-pointer" onClick={handleLogout}>
      {loc('Logout')}
    </div>
  );
}
