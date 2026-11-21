/**
 * 从 maidata.txt（simai 格式）里读出谱面的 BPM。
 * 优先用 &wholebpm；没有时取所选难度谱面里出现的所有 (BPM) 标记，
 * 只有一个值时返回它，多个时返回最小、最大值；什么都找不到返回 undefined。
 */
export function parseChartBpm(maidata: string, level?: number): { min: number; max: number } | undefined {
  const fields = new Map<string, string>();
  // 每个字段以行首的 &key= 开头，一直到下一个字段为止
  for (const match of maidata.matchAll(/^&([^=\r\n]+)=([\s\S]*?)(?=^&|(?![\s\S]))/gm)) {
    fields.set(match[1].trim(), match[2]);
  }

  const whole = Number.parseFloat(fields.get('wholebpm') ?? '');
  if (whole > 0) return { min: whole, max: whole };

  const notes = level !== undefined && fields.has(`inote_${level + 1}`)
    ? [fields.get(`inote_${level + 1}`)!]
    : [...fields].filter(([key]) => key.startsWith('inote_')).map(([, value]) => value);
  const bpms = notes.flatMap(text => [...text.matchAll(/\((\d+(?:\.\d+)?)\)/g)].map(m => Number(m[1]))).filter(bpm => bpm > 0);
  if (!bpms.length) return undefined;
  return { min: Math.min(...bpms), max: Math.max(...bpms) };
}

/** 秒数显示成 m:ss */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
