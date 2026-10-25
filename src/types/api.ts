/**
 * API 相关类型定义
 */

// API响应基础接口
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
