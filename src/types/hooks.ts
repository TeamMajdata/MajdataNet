/**
 * Hooks 相关类型定义
 */

import type { UserInfo } from './index';

// useUser Hook 返回值接口
export interface UseUserResult {
  user: UserInfo | null;
  username: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
