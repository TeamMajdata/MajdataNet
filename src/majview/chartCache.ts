/**
 * maidata.txt 的请求合并。
 *
 * 同一份谱面文本有三个地方要用：谱面预览（MajView）、侧栏的 BPM/时长、以及页面打开时的预取。
 * 谱面可能有几十 KB，重复下载既慢又占带宽，所以这里让它们共用同一个 promise；
 * 调用方的 signal 只影响自己，不会中断别的调用方。
 */
const pending = new Map<string, Promise<string>>();
/** 谱面文本可能几十 KB，只留最近几首，别让内存一直涨 */
const MAX_ENTRIES = 8;

export function loadChartText(url: string, signal?: AbortSignal): Promise<string> {
  let request = pending.get(url);
  if (!request) {
    request = fetch(url).then((response) => {
      if (!response.ok) throw Error(`Chart request failed (${response.status})`);
      return response.text();
    });
    // 失败不缓存在内存里（HTTP 层可能已经缓存了错误），下次重试
    request.catch(() => pending.delete(url));
    pending.set(url, request);
    if (pending.size > MAX_ENTRIES) pending.delete(pending.keys().next().value as string);
  }
  if (!signal) return request;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    request.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
