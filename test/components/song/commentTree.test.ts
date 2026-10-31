import { describe, expect, it } from 'vitest';
import { commentPermalink, countTree, mapTree, purge, toPlaceholder } from '@/components/song/commentTree';
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
});
