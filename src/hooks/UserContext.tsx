/**
 * 用户信息 Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { endpoints } from '@/config/api';
import type { UserInfo, UseUserContextResult } from '@/types';

const UserContext = createContext<UseUserResult | null>(null);

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
    <UserContext.Provider value={{ user, username: user?.username || '', isLoading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * 获取用户信息的 Hook
 */
export function useUserContext(): UseUserContextResult {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within UserProvider');
  return ctx;
}

/**
 * 简化版用户名获取函数（兼容 legacy 版本）
 */
export function useUsername(): string {
  const { username } = useUserContext();
  return username;
}
