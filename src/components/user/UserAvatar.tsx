import type { ImgHTMLAttributes } from 'react';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

interface UserAvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** 用户名；只有它时会先按用户名查 avatarId */
  username: string | null | undefined;
  /** 已知的头像 ID，有它就不再查询 */
  avatarId?: string | null;
}

/**
 * 用户头像。查询 avatarId 期间渲染同尺寸的占位，查到后换成图片。
 * alt 默认为用户名。
 */
export default function UserAvatar({ username, avatarId, alt, className, style, ...rest }: UserAvatarProps) {
  const src = useAvatarUrl(username, avatarId);

  if (!src) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', backgroundColor: 'rgb(255 255 255 / 0.1)', ...style }}
        aria-hidden="true"
        data-testid="avatar-placeholder"
      />
    );
  }
  return <img className={className} style={style} src={src} alt={alt ?? username ?? ''} {...rest} />;
}
