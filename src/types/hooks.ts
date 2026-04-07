/**
 * Hooks 相关类型定义
 */

import type { UserInfo } from './index';

// useUserContext Hook 返回值接口
export interface UseUserContextResult {
  user: UserInfo | null;
  username: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** @deprecated Use UseUserContextResult instead */
export type UseUserResult = UseUserContextResult;
