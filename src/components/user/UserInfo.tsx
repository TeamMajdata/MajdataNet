import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import UserAvatar from '@/components/user/UserAvatar';

/**
 * 用户信息组件
 * 显示用户头像和用户名，或显示登录链接
 */
export default function UserInfo() {
  const { t } = useTranslation();
  const { user, isLoading, error } = useUserContext();

  if (error || !user?.username) {
    return (
      <div className="hover:bg-[rgb(46,46,46)] hover:shadow-[2px_2px_5px_gray] m-[10px] p-[5px] border border-transparent hover:border-[whitesmoke] rounded-[10px] text-[gainsboro] hover:text-white transition-all duration-200">
        <Link to="/login">{t("user/UserInfo.Login")}</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="hover:bg-[rgb(46,46,46)] hover:shadow-[2px_2px_5px_gray] m-[10px] p-[5px] border border-transparent hover:border-[whitesmoke] rounded-[10px] text-[gainsboro] hover:text-white transition-all duration-200">
        <Link to="/login">...</Link>
      </div>
    );
  }

  return (
    <div className="hover:bg-[rgb(46,46,46)] hover:shadow-[2px_2px_5px_gray] m-[10px] p-[5px] border border-transparent hover:border-[whitesmoke] rounded-[10px] text-[gainsboro] hover:text-white transition-all duration-200">
      <Link to="/user">
        <UserAvatar
          className="inline-block mx-[0.1rem] rounded-[1.3rem] w-[1.3rem] h-[1.3rem] overflow-hidden cursor-pointer select-none"
          username={user.username}
          avatarId={user.avatarId}
          alt={user.nickname || user.username}
        />
        {user.nickname || user.username}
      </Link>
    </div>
  );
}
