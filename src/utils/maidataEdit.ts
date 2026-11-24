/**
 * maidata.txt 的字段级读写。
 *
 * 编辑器里只装当前难度的 fumen，保存时要把它拼回 `&inote_N=`，其余字节（别的难度、
 * 全局字段、自定义 `&xxx`、CRLF、BOM、空行）必须原样保留，所以这里按"值区间"做替换，
 * 而不是整份重新序列化。
 *
 * 字段名和 `simai.js` / `simaiSection.ts` 的约定保持一致：`N` = 难度索引 + 1。
 */

/** 难度下标 → maidata 里的一基序号（EASY=1 … UTAGE=7） */
export const fieldIndex = (level: number) => level + 1;

const FIELD_RE = /^&([\w-]+)[ \t]*=/gm;

type Span = {
  key: string;
  /** 值（去掉首尾空白）的区间 */
  start: number;
  end: number;
};

/** 扫出所有 `&key=` 字段的值区间；值一直延伸到下一个字段行之前 */
function scan(text: string): Span[] {
  const spans: Span[] = [];
  const starts: { key: string; index: number; valueStart: number }[] = [];
  FIELD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FIELD_RE.exec(text))) {
    starts.push({ key: match[1], index: match.index, valueStart: match.index + match[0].length });
  }
  for (let i = 0; i < starts.length; i++) {
    const current = starts[i];
    const next = starts[i + 1];
    const rawEnd = next ? next.index : text.length;
    let start = current.valueStart;
    let end = rawEnd;
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    spans.push({ key: current.key, start, end });
  }
  return spans;
}

/** 按出现顺序列出所有字段（值已 trim）。谱面信息窗用它渲染 `&k=v` 列表 */
export function listFields(text: string): { key: string; value: string }[] {
  return scan(text).map((span) => ({ key: span.key, value: text.slice(span.start, span.end) }));
}

/** 读一个字段的值（已 trim）；不存在返回 undefined */
export function getField(text: string, key: string): string | undefined {
  const span = scan(text).find((item) => item.key === key);
  return span ? text.slice(span.start, span.end) : undefined;
}

/** 文本用的换行符：整份文件是 CRLF 就用 CRLF */
function lineEnding(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * 写一个字段。存在则只替换值区间，不存在则追加到末尾。
 * 其余内容（包括字段前后的空行）保持不变。
 */
export function setField(text: string, key: string, value: string): string {
  const span = scan(text).find((item) => item.key === key);
  if (span) return text.slice(0, span.start) + value + text.slice(span.end);
  const eol = lineEnding(text);
  const suffix = text.endsWith(eol) || text.endsWith('\n') || text.endsWith('\r') ? '' : eol;
  return `${text}${suffix}&${key}=${value}${eol}`;
}

/** 删除一个字段（连带它那一行） */
export function removeField(text: string, key: string): string {
  const span = scan(text).find((item) => item.key === key);
  if (!span) return text;
  // 从字段行首找到下一行行首
  const lineStart = text.lastIndexOf('\n', span.start) + 1;
  const lineEnd = text.indexOf('\n', span.end);
  return text.slice(0, lineStart) + (lineEnd === -1 ? '' : text.slice(lineEnd + 1));
}

// ---- 按难度取值的便捷封装 ----

export const getDifficultyText = (text: string, level: number) => getField(text, `inote_${fieldIndex(level)}`) ?? '';

export const setDifficultyText = (text: string, level: number, fumen: string) =>
  setField(text, `inote_${fieldIndex(level)}`, fumen);

export const getLevel = (text: string, level: number) => getField(text, `lv_${fieldIndex(level)}`) ?? '';

export const setLevel = (text: string, level: number, value: string) =>
  setField(text, `lv_${fieldIndex(level)}`, value);

export const getDesigner = (text: string, level: number) => getField(text, `des_${fieldIndex(level)}`) ?? '';

export const setDesigner = (text: string, level: number, value: string) =>
  setField(text, `des_${fieldIndex(level)}`, value);

/** 全局 first 偏移（秒）。读不到时返回 0 */
export function getFirst(text: string): number {
  const raw = getField(text, 'first');
  const value = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(value) ? value : 0;
}

export const setFirst = (text: string, seconds: number) =>
  setField(text, 'first', String(Number(seconds.toFixed(2))));

/** 这份谱面里实际存在内容的难度下标（0..6），用于页签禁用态 */
export function filledDifficulties(text: string): boolean[] {
  const spans = scan(text);
  return Array.from({ length: 7 }, (_, level) => {
    const span = spans.find((item) => item.key === `inote_${level + 1}`);
    return span !== undefined && span.end > span.start;
  });
}

/** 新建谱面的空模板：标题 / 曲师 / First + 7 个空难度 */
export function blankMaidata(): string {
  return [
    '&title=',
    '&artist=',
    '&first=0',
    ...Array.from({ length: 7 }, (_, level) => `&inote_${fieldIndex(level)}=`),
    '',
  ].join('\n');
}
