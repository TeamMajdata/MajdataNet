import { describe, expect, it } from 'vitest';
import {
  blankMaidata,
  filledDifficulties,
  getDesigner,
  getDifficultyText,
  getField,
  getFirst,
  getLevel,
  setDesigner,
  setDifficultyText,
  setField,
  setFirst,
  setLevel,
} from '@/utils/maidataEdit';
import { extractDifficulty } from '@/utils/simaiSection';

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

describe('maidataEdit 读取', () => {
  it('读得到字段，trim 掉首尾空白', () => {
    expect(getField(SAMPLE, 'title')).toBe('Song');
    expect(getField(SAMPLE, 'inote_1')).toBe('(120){4},1,2,');
    expect(getField(SAMPLE, 'nope')).toBeUndefined();
  });

  it('按难度取值', () => {
    expect(getDifficultyText(SAMPLE, 4)).toBe('(160){4},1-2[4:1],');
    expect(getDifficultyText(SAMPLE, 0)).toBe('(120){4},1,2,');
    expect(getDifficultyText(SAMPLE, 6)).toBe('');
    expect(getLevel(SAMPLE, 4)).toBe('14');
    expect(getDesigner(SAMPLE, 4)).toBe('sabi');
  });

  it('first 解析成数字，读不到给 0', () => {
    expect(getFirst(SAMPLE)).toBe(0);
    expect(getFirst('&first=0.35\n')).toBe(0.35);
    expect(getFirst('&title=x\n')).toBe(0);
  });

  it('能区分哪些难度有内容', () => {
    expect(filledDifficulties(SAMPLE)).toEqual([true, false, false, false, true, false, false]);
  });
});

describe('maidataEdit 写入', () => {
  it('只替换值，其他字段逐字不动', () => {
    const next = setDifficultyText(SAMPLE, 4, '(160){4},1,');
    expect(next).toContain('&inote_1=(120){4},1,2,');
    expect(next).toContain('&lv_5=14');
    expect(next).toContain('&first=0');
    expect(getDifficultyText(next, 4)).toBe('(160){4},1,');
  });

  it('写回后再读出来是同一份 fumen（和 extractDifficulty 对齐）', () => {
    const fumen = '|| comment\n{16}1,2,3,4,';
    const next = setDifficultyText(SAMPLE, 0, fumen);
    expect(extractDifficulty(next, 0)).toBe(fumen);
    expect(getDifficultyText(next, 0)).toBe(fumen);
  });

  it('缺少的字段追加到末尾', () => {
    const next = setDesigner(SAMPLE, 1, 'someone');
    expect(getDesigner(next, 1)).toBe('someone');
    expect(next.trimEnd().endsWith('&des_2=someone')).toBe(true);
  });

  it('保留 CRLF 和 BOM', () => {
    const crlf = '\uFEFF&title=Song\r\n&inote_1=1,\r\n';
    const next = setDifficultyText(crlf, 0, '2,');
    expect(next.startsWith('\uFEFF&title=Song\r\n')).toBe(true);
    expect(next).toContain('&inote_1=2,\r\n');
    expect(next.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('追加时使用文件原有的换行符', () => {
    const crlf = '&title=Song\r\n';
    expect(setLevel(crlf, 0, '12')).toBe('&title=Song\r\n&lv_1=12\r\n');
    expect(setLevel('&title=Song\n', 0, '12')).toBe('&title=Song\n&lv_1=12\n');
  });

  it('多行 fumen 整体替换，不吞掉后面的字段', () => {
    const next = setDifficultyText(SAMPLE, 4, 'a\nb\nc');
    expect(getLevel(next, 4)).toBe('14');
    expect(getDesigner(next, 4)).toBe('sabi');
  });

  it('first 写回保留两位小数', () => {
    expect(getFirst(setFirst(SAMPLE, 0.456))).toBe(0.46);
    expect(getFirst(setFirst(SAMPLE, -0.1))).toBe(-0.1);
  });

  it('setField 保留字段前的空行', () => {
    const text = '&title=A\n\n&artist=B\n';
    expect(setField(text, 'artist', 'C')).toBe('&title=A\n\n&artist=C\n');
  });

  it('给空值字段写入时，写在等号后面而不是下一行', () => {
    const text = '&inote_5=\n&inote_6=\n';
    expect(setField(text, 'inote_5', '1,2,3,4,')).toBe('&inote_5=1,2,3,4,\n&inote_6=\n');
    // 关键：不能把下一个字段吞进值里
    expect(getField(setField(text, 'inote_5', '1,2,3,4,'), 'inote_5')).toBe('1,2,3,4,');
    expect(getField(setField(text, 'inote_5', '1,2,3,4,'), 'inote_6')).toBe('');
  });

  it('新建的空模板写入难度后能原样读回', () => {
    const blank = blankMaidata();
    const typed = setDifficultyText(blank, 4, '(180){4},1,2,3,4,');
    expect(getDifficultyText(typed, 4)).toBe('(180){4},1,2,3,4,');
    // 相邻难度必须还是空的
    expect(getDifficultyText(typed, 5)).toBe('');
    expect(getDifficultyText(typed, 3)).toBe('');
  });

  it('清空难度再写回也没问题', () => {
    const typed = setDifficultyText(blankMaidata(), 0, '1,2,');
    const cleared = setDifficultyText(typed, 0, '');
    expect(getDifficultyText(cleared, 0)).toBe('');
    const again = setDifficultyText(cleared, 0, '3,4,');
    expect(getDifficultyText(again, 0)).toBe('3,4,');
    expect(getDifficultyText(again, 1)).toBe('');
  });
});
