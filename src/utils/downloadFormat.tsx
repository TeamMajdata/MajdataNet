import { createRoot } from 'react-dom/client';
import DownloadFormatDialog, { type DownloadFormat } from '@/components/ui/DownloadFormatDialog';

const LAST_FORMAT_KEY = 'DownloadType';

function readLastFormat(): DownloadFormat | null {
  try {
    const value = localStorage.getItem(LAST_FORMAT_KEY);
    return value === 'zip' || value === 'adx' ? value : null;
  } catch {
    return null;
  }
}

function saveLastFormat(format: DownloadFormat) {
  try {
    localStorage.setItem(LAST_FORMAT_KEY, format);
  } catch {
    // 存不了也不影响这次下载
  }
}

/** 下载前询问打包格式；取消时返回 null。选中的格式会记住，下次默认聚焦 */
export function chooseDownloadFormat(title: string): Promise<DownloadFormat | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const previousFocus = document.activeElement as HTMLElement | null;

    const done = (format: DownloadFormat | null) => {
      if (format) saveLastFormat(format);
      previousFocus?.focus?.({ preventScroll: true });
      resolve(format);
    };
    // 关闭动画播完才卸载；放到下一个任务里，避免在 React 自己的回调里同步卸载
    const closed = () => setTimeout(() => {
      root.unmount();
      host.remove();
    });

    root.render(<DownloadFormatDialog title={title} lastFormat={readLastFormat()} onDone={done} onClosed={closed} />);
  });
}
