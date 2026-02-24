/**
 * 评论相关类型定义
 */

// 评论接口
export interface Comment {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  replies?: Comment[];
  replyTo?: string;
  contentPrefix?: string;
  contentBody?: string;
}
