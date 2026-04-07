/**
 * 用户信息 Hooks
 */
import { useContext } from 'react';
import { UserContext } from '@/contexts/userContextDef';
import type { UseUserContextResult } from '@/types';

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
