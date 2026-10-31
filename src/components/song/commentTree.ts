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

/** 一个线程初始显示多少回复。 */
export interface FoldPolicy {
  /** 起点之下最多显示几条回复。 */
  budget: number;
  /** 从起点往下最多展开几层。 */
  depth: number;
  /** 起点的直接回复最多显示几条。 */
  rootReplies: number;
  /** 更深的评论各自最多显示几条直接回复。 */
  replies: number;
}

/**
 * 和 Reddit 一样，长线程只先显示一部分，其余折叠成「N 条回复」。
 * 按层广度优先挑选：同层按排序先到先得，超出条数、层数或总数的留给读者展开。
 * 只差一条没有回复的评论时不折叠，因为折叠按钮和那条评论一样占地方。
 * 起点的前 skip 条回复已经显示过，不再计入。
 * 返回每条评论初始显示的直接回复条数，不在结果里的就是 0。
 */
export function planReplies(root: Comment, policy: FoldPolicy, skip = 0): Map<string, number> {
  const shown = new Map<string, number>();
  let budget = policy.budget;
  let level: { comment: Comment; depth: number }[] = [{ comment: root, depth: 0 }];
  while (level.length > 0 && budget > 0) {
    const next: typeof level = [];
    for (const { comment, depth } of level) {
      const offset = comment === root ? skip : 0;
      const replies = comment.replies.slice(offset);
      const cap = depth >= policy.depth ? 0 : comment === root ? policy.rootReplies : policy.replies;
      let count = Math.min(replies.length, cap, budget);
      if (replies.length - count === 1 && replies[count].replyCount === 0 && budget > count) count++;
      if (count === 0) continue;
      shown.set(comment.id, offset + count);
      budget -= count;
      next.push(...replies.slice(0, count).map((reply) => ({ comment: reply, depth: depth + 1 })));
    }
    level = next;
  }
  return shown;
}
