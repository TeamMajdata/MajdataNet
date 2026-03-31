/**
 * 用户信息 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { endpoints } from '@/config/api';
import type { UserInfo, UseUserResult } from '@/types';

/**
 * 获取用户信息的 Hook
 * @param autoFetch 是否自动获取（默认true）
 */
export function useUser(autoFetch = true): UseUserResult {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoints.account.info, {
        mode: 'cors',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 检查返回的数据是否有用户名
      if (data && data.username) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user info'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchUser();
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    username: user?.username || '',
    isLoading,
    error,
    refetch: fetchUser,
  };
}

/**
 * 简化版用户名获取函数（兼容 legacy 版本）
 * 注意：这是一个 Hook，必须在 React 组件中使用
 */
export function useUsername(): string {
  const { username } = useUser();
  return username;
}
