/**
 * 编辑器的详细日志开关。
 *
 * 默认只在开发模式（`pnpm dev`）打开；线上排查问题时在地址后面加 `?debug=1` 打开（会写进
 * localStorage，之后刷新也保持），`?debug=0` 关掉。所有输出都带 `[MajdataEdit][区域]` 前缀，
 * 方便在 console 里按区域过滤：picker / editor / majview / audio。
 *
 * 记日志的原则：只记排查问题时有用的事实（谁被调用、参数、耗时、错误、状态），不记频谱级、
 * 逐帧的高频数据——编辑器每敲一个字都会重编译，逐帧日志反而会把真正有用的信息淹掉。
 */
const STORAGE_KEY = 'MajdataEditVerboseLog';

function readInitialEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('debug');
    if (flag === '1') {
      localStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (flag === '0') {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
  } catch {
    /* 无痕模式读不了 localStorage，就按开发模式判断 */
  }
  return Boolean(import.meta.env.DEV);
}

let enabled = readInitialEnabled();

/** 当前是否在记详细日志（页面里也可以用它决定是否额外采集状态） */
export function verboseLogging(): boolean {
  return enabled;
}

/** 运行时开关，返回切换后的状态 */
export function setVerboseLogging(next: boolean): boolean {
  enabled = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 存不了就只对这次页面有效 */
  }
  return enabled;
}

const prefix = (area: string) => `[MajdataEdit][${area}]`;

/** 普通事件：调用链、参数、耗时 */
export function editorLog(area: string, message: string, data?: unknown): void {
  if (!enabled) return;
  if (data === undefined) console.info(prefix(area), message);
  else console.info(prefix(area), message, data);
}

/** 可疑但不致命：走了回退、被忽略、状态和预期不一致 */
export function editorWarn(area: string, message: string, data?: unknown): void {
  if (!enabled) return;
  if (data === undefined) console.warn(prefix(area), message);
  else console.warn(prefix(area), message, data);
}

/** 失败：把原始错误对象一起打出来（含 stack），不要只留 message */
export function editorError(area: string, message: string, error?: unknown, data?: unknown): void {
  if (!enabled) return;
  if (data === undefined) console.error(prefix(area), message, error);
  else console.error(prefix(area), message, error, data);
}

/**
 * 记录一次「用户手势 / 焦点 / 可见性」快照。
 * 文件选择器不弹框最常见的原因就是调用时已经没有用户手势了，所以每次调用 picker 前后都记一份。
 */
export function activationSnapshot(): Record<string, unknown> {
  const activation = typeof navigator !== 'undefined' ? navigator.userActivation : undefined;
  return {
    activation: activation ? { active: activation.isActive, ever: activation.hasBeenActive } : null,
    focus: typeof document !== 'undefined' ? document.hasFocus() : null,
    visibility: typeof document !== 'undefined' ? document.visibilityState : null,
  };
}
