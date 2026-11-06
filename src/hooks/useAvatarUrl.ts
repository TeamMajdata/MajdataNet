import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { UserInfo } from '@/types';
import { apiFetcher } from '@/utils/apiClient';

/** 后端的默认头像 ID：用户没上传头像时资料里就是它，也可直接请求。 */
export const DEFAULT_AVATAR_ID = 'default';

/**
 * 用户头像的地址，统一走 GET /api/avatar/{avatarId}。
 *
 * 已知 avatarId 时直接使用，不发请求：资料对象、成绩总分榜和季赛榜的 player、评论的 authorProfile、
 * 单曲排行榜的 player 都带着它。只给用户名的（谱面上传者，或上述资料为 null/缺失）
 * 按用户名读一次公开资料取 avatarId（与个人空间共用同一 SWR 缓存，同名只请求一次）。
 * 用户名为空、用户不存在或请求失败时用默认头像。
 *
 * @returns 头像地址；还在查询时为 null，调用方先显示占位，避免默认头像闪一下再替换。
 */
export function useAvatarUrl(username: string | null | undefined, avatarId?: string | null): string | null {
  const lookup = !avatarId && username ? endpoints.account.profile(username) : null;
  const { data, error } = useSWR<UserInfo>(lookup, apiFetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });

  if (avatarId) {
    return endpoints.account.avatar(avatarId);
  }
  if (!username || error) {
    return endpoints.account.avatar(DEFAULT_AVATAR_ID);
  }
  if (!data) {
    return null;
  }
  return endpoints.account.avatar(data.avatarId || DEFAULT_AVATAR_ID);
}
