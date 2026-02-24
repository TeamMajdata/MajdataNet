/**
 * 睡眠函数 - 延迟执行
 * @param ms 毫秒数
 */
export default function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
