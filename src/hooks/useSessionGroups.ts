import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { SessionInfo, UserGroup } from '@/types';
import { apiFetcher } from '@/utils/apiClient';
import { useUserContext } from './useUserContext';

const noGroups: UserGroup[] = [];

export interface SessionGroupsState {
  /** 当前会话实际能用的用户组；未登录、请求失败或旧版后端时为空。 */
  groups: UserGroup[];
  isLoading: boolean;
}

/** 当前会话能用的用户组，读 account/session；未登录不发请求。 */
export function useSessionGroups(): SessionGroupsState {
  const { user, isLoading: isUserLoading } = useUserContext();
  const { data, error } = useSWR<SessionInfo>(user ? endpoints.account.session : null, apiFetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  return {
    groups: data?.groups ?? noGroups,
    isLoading: isUserLoading || (!!user && !data && !error),
  };
}

/** administrator 通过所有用户组的检查，与后端一致。 */
export function hasUserGroup(groups: readonly UserGroup[], group: UserGroup): boolean {
  return groups.includes('administrator') || groups.includes(group);
}
