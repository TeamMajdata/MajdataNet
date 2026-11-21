/**
 * 谱面页的“谱面文件”页签只显示当前难度，所以要从 maidata.txt 里取出对应的 `&inote_N=` 字段。
 *
 * 字段从行首的 `&inote_N=` 开始，到下一个 `&xxx=` 字段（或文件末尾）结束；
 * 行尾、CRLF 和 BOM 在这里一起处理掉，返回值去掉首尾空白（和 simai.js 的 readMaidata 一致）。
 */
export function extractDifficulty(text: string, level: number): string {
  const key = `inote_${level + 1}`;
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const field = new RegExp(`^&${key}[ \\t]*=([\\s\\S]*?)(?=^&[\\w-]+[ \\t]*=|(?![\\s\\S]))`, 'm');
  return field.exec(source)?.[1].trim() ?? '';
}
