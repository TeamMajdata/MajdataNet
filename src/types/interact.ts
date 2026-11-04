/**
 * 投票与评论（Reddit 式互动系统）的类型定义，对应 mmfcapi 的 CommentController / InteractController。
 */

/** 一票：1 赞、-1 踩、0 未投。 */
export type Vote = -1 | 0 | 1;

/** 投票接口的返回：谱面带 upvotes/downvotes，评论只有 score。 */
export interface VoteResult {
  score: number;
  upvotes?: number;
  downvotes?: number;
  myVote: Vote;
}

/** 列表里展示的谱面计数（GET/POST interactsum）。 */
export interface ChartInteractSummary {
  chartId: string;
  plays: number;
  score: number;
  upvotes: number;
  downvotes: number;
  comments: number;
  myVote: Vote;
}

export type CommentSort = 'best' | 'top' | 'new' | 'old' | 'controversial';

export const COMMENT_SORTS: readonly CommentSort[] = ['best', 'top', 'new', 'old', 'controversial'];

/** 一条评论；占位符（已删除/已移除）没有作者和正文，但保留回复。 */
export interface Comment {
  id: string;
  chartId: string | null;
  chartHash: string;
  chartTitle?: string;
  parentId: string | null;
  depth: number;
  authorId: string | null;
  author: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  removed: boolean;
  score: number;
  myVote: Vote;
  replyCount: number;
  replies: Comment[];
}

/** 一页顶层评论及其全部回复。 */
export interface CommentPage {
  items: Comment[];
  total: number;
  commentCount: number;
  page: number;
  pageSize: number;
  sort: CommentSort;
}

/** 一条评论的永久链接视图：它和它之下的全部回复。 */
export interface CommentThread {
  item: Comment;
  sort: CommentSort;
}

/** 平铺的评论列表，例如用户的评论历史。 */
export interface CommentList {
  items: Comment[];
  total: number;
  page: number;
  pageSize: number;
}

/** 删除评论的结果：purged 为 true 表示物理删除，否则变成占位符。 */
export interface CommentDeletion {
  ok: boolean;
  purged: boolean;
}
