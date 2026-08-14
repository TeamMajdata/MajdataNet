import { Link } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import { endpoints } from '@/config/api';
import { loc } from '@/utils';

/**
 * 用户信息组件
 * 显示用户头像和用户名，或显示登录链接
 */
export default function UserInfo() {
  const { user, isLoading, error } = useUserContext();

  if (error || !user?.username) {
    return (
      <div className="hover:bg-surface-2 m-[10px] p-[5px] border border-transparent hover:border-line rounded-[10px] text-ink-2 hover:text-ink transition-colors duration-200">
        <Link to="/login">{loc('Login')}</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="hover:bg-surface-2 m-[10px] p-[5px] border border-transparent hover:border-line rounded-[10px] text-ink-2 hover:text-ink transition-colors duration-200">
        <Link to="/login">...</Link>
      </div>
    );
  }

  return (
    <div className="hover:bg-surface-2 m-[10px] p-[5px] border border-transparent hover:border-line rounded-[10px] text-ink-2 hover:text-ink transition-colors duration-200">
      <Link to="/user">
        <img
          className="inline-block mx-[0.1rem] rounded-[1.3rem] w-[1.3rem] h-[1.3rem] overflow-hidden cursor-pointer select-none"
          src={endpoints.account.icon(user.username)}
          alt={user.username}
        />
        {user.username}
      </Link>
    </div>
  );
}
