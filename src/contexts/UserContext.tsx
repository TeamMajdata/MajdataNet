/**
 * 用户信息 Context - 提供全局用户状态管理
 */
import React, { useState, useEffect, useCallback } from 'react';
import { endpoints } from '@/config/api';
import type { UserInfo } from '@/types';
import { UserContext } from './userContextDef';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    fetchUser();
  }, [fetchUser]);

  return (
    //TODO: 把类型提取出来
    <UserContext.Provider value={{ user, username: user?.username || '', isLoading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}
