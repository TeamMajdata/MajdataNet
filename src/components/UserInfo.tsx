import { Link } from 'react-router-dom';
import { useUser } from '@/hooks';
import { apiroot3 } from '@/config/api';
import { loc } from '@/utils';

/**
 * 用户信息组件
 * 显示用户头像和用户名，或显示登录链接
 */
export default function UserInfo() {
  const { user, isLoading, error } = useUser();

  if (error || !user?.username) {
    return (
      <div className="linkContent">
        <Link to="/login">{loc('Login')}</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="linkContent">
        <Link to="/login">...</Link>
      </div>
    );
  }

  return (
    <div className="linkContent">
      <Link to="/user">
        <img
          className="smallIcon"
          src={`${apiroot3}/account/Icon?username=${user.username}`}
          alt={user.username}
        />
        {user.username}
      </Link>
    </div>
  );
}
