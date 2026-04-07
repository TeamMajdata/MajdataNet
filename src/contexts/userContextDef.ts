/**
 * User Context 定义
 * 单独文件存放以符合 React Fast Refresh 规范
 */
import { createContext } from 'react';
import type { UseUserContextResult } from '@/types';

export const UserContext = createContext<UseUserContextResult | null>(null);
