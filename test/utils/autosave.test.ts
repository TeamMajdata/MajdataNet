import { describe, expect, it } from 'vitest';
import { listFields } from '@/utils/maidataEdit';
import { shouldOfferRestore } from '@/utils/autosave';

const SAMPLE = [
  '&title=Song',
  '&artist=Artist',
  '&first=0',
  '&inote_1=(120){4},1,2,',
  '&inote_5=(160){4},1-2[4:1],',
  '&lv_5=14',
  '&des_5=sabi',
  '',
].join('\n');

describe('listFields', () => {
  it('按出现顺序列出所有字段', () => {
    expect(listFields(SAMPLE).map((field) => field.key))
      .toEqual(['title', 'artist', 'first', 'inote_1', 'inote_5', 'lv_5', 'des_5']);
  });

  it('值已 trim，多行值保留内部换行', () => {
    const text = '&title=A\n&inote_1=1,2,\n3,4,\n&lv_1=12\n';
    expect(listFields(text).find((field) => field.key === 'inote_1')?.value).toBe('1,2,\n3,4,');
  });

  it('空字段也会列出来', () => {
    expect(listFields('&title=\n')).toEqual([{ key: 'title', value: '' }]);
  });
});

describe('shouldOfferRestore', () => {
  const file = { maidata: 'A', modifiedAt: 1000 };

  it('没有草稿就不提示', () => {
    expect(shouldOfferRestore(null, file)).toBe(false);
  });

  it('草稿和文件内容一样就不提示', () => {
    expect(shouldOfferRestore({ maidata: 'A', savedAt: 2000 }, file)).toBe(false);
  });

  it('草稿比文件旧就不提示', () => {
    expect(shouldOfferRestore({ maidata: 'B', savedAt: 500 }, file)).toBe(false);
  });

  it('草稿比文件新且内容不同才提示', () => {
    expect(shouldOfferRestore({ maidata: 'B', savedAt: 2000 }, file)).toBe(true);
  });
});
