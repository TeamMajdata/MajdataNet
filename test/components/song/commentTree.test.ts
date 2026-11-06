import { describe, expect, it } from 'vitest';
import { commentPermalink, countTree, mapTree, planReplies, purge, toPlaceholder } from '@/components/song/commentTree';
import type { Comment } from '@/types';

function comment(id: string, replies: Comment[] = [], extra: Partial<Comment> = {}): Comment {
  return {
    id, chartId: 'chart', chartHash: 'hash', parentId: null, depth: 0, authorId: 'u1', author: 'alice', body: id,
    createdAt: '2026-10-01T00:00:00Z', editedAt: null, deleted: false, removed: false, score: 1, myVote: 0,
    replyCount: replies.length, replies, ...extra,
  };
}

describe('comment tree helpers', () => {
  it('mapTree replaces one comment wherever it sits', () => {
    const tree = [comment('a', [comment('b', [comment('c')])])];
    const next = mapTree(tree, 'c', (c) => ({ ...c, score: 9 }));
    expect(next[0].replies[0].replies[0].score).toBe(9);
    // 其它节点保持原引用之外的值不变
    expect(next[0].body).toBe('a');
    expect(tree[0].replies[0].replies[0].score).toBe(1);
  });

  it('purge drops the comment and the placeholder ancestors that only kept it', () => {
    const placeholder = comment('p', [comment('leaf')], { deleted: true, body: '', author: '' });
    const tree = [comment('root', [placeholder, comment('sibling')])];
    const next = purge(tree, 'leaf');
    // 占位符随最后一条回复一起消失，存活的 root 留下并少了一条回复
    expect(next[0].replies.map((c) => c.id)).toEqual(['sibling']);
    expect(next[0].replyCount).toBe(1);
  });

  it('purge keeps a placeholder that still has other replies', () => {
    const placeholder = comment('p', [comment('leaf'), comment('other')], { deleted: true });
    const next = purge([placeholder], 'leaf');
    expect(next).toHaveLength(1);
    expect(next[0].replyCount).toBe(1);
  });

  it('toPlaceholder clears author and body and marks who removed it', () => {
    const removed = toPlaceholder(comment('a'), true);
    expect(removed).toMatchObject({ body: '', author: '', authorId: null, deleted: false, removed: true });
    expect(toPlaceholder(comment('a'), false)).toMatchObject({ deleted: true, removed: false });
  });

  it('countTree counts every node and commentPermalink points at the song page', () => {
    expect(countTree([comment('a', [comment('b'), comment('c', [comment('d')])])])).toBe(4);
    expect(commentPermalink('chart id', 'c/1')).toBe('/song?id=chart%20id&comment=c%2F1');
  });

  describe('planReplies', () => {
    const policy = { budget: 10, depth: 2, rootReplies: 3, replies: 1 };
    const chain = (ids: string[]): Comment => ids.reduceRight<Comment | null>((child, id) => comment(id, child ? [child] : []), null)!;

    it('shows a few replies per level and folds the rest', () => {
      const root = comment('root', [
        comment('a', [comment('a1', [comment('x', [comment('z')])]), comment('a2', [comment('y')])]),
        comment('b'),
        comment('c'),
        comment('d', [comment('d1')]),
        comment('e', [comment('e1')]),
      ]);
      const plan = planReplies(root, policy);
      // 根显示前三条；a 只显示一条，a1 已到第二层，它的回复折叠
      expect(plan.get('root')).toBe(3);
      expect(plan.get('a')).toBe(1);
      expect(plan.get('a1')).toBeUndefined();
    });

    it('never folds a single reply that has no replies of its own', () => {
      const root = comment('root', [comment('a', [comment('a1', [comment('leaf')])]), comment('b')]);
      const plan = planReplies(root, { ...policy, rootReplies: 1 });
      // b 是最后一条且没有回复，直接显示；第二层 a1 下只剩一条叶子也直接显示
      expect(plan.get('root')).toBe(2);
      expect(plan.get('a1')).toBe(1);
      // 被截断的回复（服务端还有更多）不算叶子
      const truncated = comment('root', [comment('a'), comment('b', [], { replyCount: 3 })]);
      expect(planReplies(truncated, { ...policy, rootReplies: 1 }).get('root')).toBe(1);
    });

    it('folds a long single-reply chain at the depth limit and stops at the budget', () => {
      const root = chain(['c0', 'c1', 'c2', 'c3', 'c4']);
      expect([...planReplies(root, policy)]).toEqual([['c0', 1], ['c1', 1]]);
      const wide = comment('root', Array.from({ length: 8 }, (_, i) => comment(`r${i}`)));
      expect(planReplies(wide, { ...policy, budget: 4, rootReplies: 8 }).get('root')).toBe(4);
    });

    it('continues after the replies already shown when expanding', () => {
      const root = comment('root', Array.from({ length: 6 }, (_, i) => comment(`r${i}`, [comment(`r${i}x`, [comment(`r${i}y`)])])));
      const plan = planReplies(root, { ...policy, rootReplies: 2 }, 2);
      expect(plan.get('root')).toBe(4);
      expect(plan.has('r0')).toBe(false);
      expect(plan.get('r2')).toBe(1);
    });
  });
});
