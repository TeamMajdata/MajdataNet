/**
 * 评论树的纯函数：在不可变的树上更新、添加回复、删除。
 */

import type { Comment } from '@/types';

/** 找到 id 对应的评论并替换它。 */
export function mapTree(items: Comment[], id: string, change: (comment: Comment) => Comment): Comment[] {
  return items.map((c) => (c.id === id ? change(c) : { ...c, replies: mapTree(c.replies, id, change) }));
}

/**
 * 和服务端一致：物理删除的评论消失，之后没有回复的占位祖先也一并消失。
 */
export function purge(items: Comment[], id: string): Comment[] {
  return items
    .filter((c) => c.id !== id)
    .map((c) => {
      const replies = purge(c.replies, id);
      return replies.length === c.replies.length ? c : { ...c, replies, replyCount: c.replyCount - 1 };
    })
    .filter((c) => !((c.deleted || c.removed) && c.replyCount === 0));
}

/** 树中的评论总数（含占位符）。 */
export function countTree(items: Comment[]): number {
  return items.reduce((n, c) => n + 1 + countTree(c.replies), 0);
}

/** 把评论变成占位符：正文、作者清空，标记删除或移除。 */
export function toPlaceholder(comment: Comment, removed: boolean): Comment {
  return { ...comment, body: '', author: '', authorId: null, deleted: !removed, removed };
}

/** 评论的永久链接：歌曲页加 comment 参数。 */
export function commentPermalink(chartId: string, commentId: string): string {
  return `/song?id=${encodeURIComponent(chartId)}&comment=${encodeURIComponent(commentId)}`;
}
