import { endpoints } from '@/config/api';
import { chooseDownloadFormat } from './downloadFormat';
import { stripTmpTags } from './richTextUtils';
import DownloadToast, { type DownloadFileKey, type DownloadFileState, type DownloadStatus } from '@/components/ui/DownloadToast';
import type { DownloadSongParams } from '@/types/download';

interface DownloadFile {
  key: DownloadFileKey;
  path: string;
  zipName: string;
  /** 缺少必需文件时整个下载失败；视频是可选的 */
  required: boolean;
}

const FILES: DownloadFile[] = [
  { key: 'track', path: '/track', zipName: 'track.mp3', required: true },
  { key: 'bg', path: '/image?fullImage=true', zipName: 'bg.jpg', required: true },
  // intent=download 让后端把这次请求记为主动下载（预览加载不带此参数）
  { key: 'chart', path: '/chart?intent=download', zipName: 'maidata.txt', required: true },
  { key: 'video', path: '/video', zipName: 'pv.mp4', required: false },
];

function downloadFile(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** 并行下载谱面的音频、背景、谱面和视频，打包成 zip/adx；整个过程只显示一条通知 */
export async function downloadSong(props: DownloadSongParams): Promise<void> {
  const { toast, title } = props;
  // 先问要哪种格式，取消就什么都不下载
  const downloadExtension = await chooseDownloadFormat(stripTmpTags(title) || title);
  if (!downloadExtension) return;
  // 打包和下载用的库只在真正下载时才加载，不占首屏体积
  const [{ default: JSZip }, { default: axios }] = await Promise.all([import('jszip'), import('axios')]);
  const zip = new JSZip();
  const abortController = new AbortController();
  const prefix = endpoints.maichart.prefix(props.id);

  const states = Object.fromEntries(FILES.map((file) => [file.key, 'loading'])) as Record<DownloadFileKey, DownloadFileState>;
  const sizes = Object.fromEntries(FILES.map((file) => [file.key, { loaded: 0, total: 0 }])) as Record<DownloadFileKey, { loaded: number; total: number }>;

  const overallProgress = () => {
    let loaded = 0;
    let total = 0;
    for (const file of FILES) {
      if (states[file.key] === 'missing' || !sizes[file.key].total) continue;
      loaded += sizes[file.key].loaded;
      total += sizes[file.key].total;
    }
    return total ? loaded / total : undefined;
  };

  const render = (status: DownloadStatus) => (
    <DownloadToast title={title} status={status} files={{ ...states }} progress={overallProgress()} />
  );

  const toastId = toast.loading(render('loading'), { icon: false, closeButton: false, className: 'download-toast' });

  // 进度事件很密集，合并到下一帧再刷新通知
  let scheduled = false;
  const refresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      toast.update(toastId, { render: render('loading') });
    });
  };

  const fetchOne = async (file: DownloadFile): Promise<Blob | undefined> => {
    try {
      const response = await axios.get<Blob>(prefix + file.path, {
        responseType: 'blob',
        signal: abortController.signal,
        onDownloadProgress: (event) => {
          if (event.total) sizes[file.key] = { loaded: event.loaded, total: event.total };
          refresh();
        },
      });
      states[file.key] = 'done';
      refresh();
      return response.data;
    } catch (error) {
      // 被取消的请求只是没下完，不算失败原因
      states[file.key] = file.required && !axios.isCancel(error) ? 'failed' : 'missing';
      // 必需文件失败后其他请求没有意义，直接取消
      if (file.required) abortController.abort();
      refresh();
      return undefined;
    }
  };

  const results = await Promise.all(FILES.map(fetchOne));
  const finish = (status: DownloadStatus) => {
    toast.update(toastId, {
      render: render(status),
      type: status === 'done' ? 'success' : 'error',
      isLoading: false,
      icon: false,
      autoClose: status === 'done' ? 3000 : 5000,
    });
  };

  if (FILES.some((file, index) => file.required && results[index] === undefined)) {
    finish('failed');
    return;
  }

  FILES.forEach((file, index) => {
    const blob = results[index];
    if (blob !== undefined) zip.file(file.zipName, blob);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/' + downloadExtension }));
  finish('done');
  downloadFile(url, title + '.' + downloadExtension);
}
