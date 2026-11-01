import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { SessionInfo } from '@/types';
import { apiFetcher } from '@/utils/apiClient';
import { useUserContext } from './useUserContext';

/** 当前会话能否以管理员身份操作，读 account/session 的 groups；未登录不发请求。 */
export function useIsAdministrator(): boolean {
  const { user } = useUserContext();
  const { data } = useSWR<SessionInfo>(user ? endpoints.account.session : null, apiFetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  return data?.groups?.includes('administrator') ?? false;
}
