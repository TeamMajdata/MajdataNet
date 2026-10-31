import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { useUserContext } from './useUserContext';

/**
 * 当前用户是否为管理员。资料接口不返回用户组，所以用只有管理员能调用的接口探测：
 * 200 为管理员，403 不是；未登录不发请求。
 */
export function useIsAdministrator(): boolean {
  const { user } = useUserContext();
  const { data } = useSWR(user ? endpoints.admin.groups : null, apiFetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  return data !== undefined;
}
