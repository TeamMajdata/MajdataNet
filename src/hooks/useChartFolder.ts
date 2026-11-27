/**
 * 读取用户本地的一个谱面文件夹（maidata.txt + track + bg + pv）。
 *
 * 优先用 File System Access API（可以原地保存）；不支持时回退到 <input webkitdirectory>
 * （只读，保存走下载）。两条路径最后都归一到同一份 `ChartFolder`，页面不用区分。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { blankMaidata } from '@/utils/maidataEdit';
import { endpoints } from '@/config/api';
import { loadChartText } from '@/majview/chartCache';
import { activationSnapshot, editorError, editorLog, editorWarn } from '@/utils/editorLog';

export type ChartFolder = {
  /** 文件夹名，用来显示 */
  name: string;
  maidata: string;
  /** maidata.txt 的修改时间，用来判断本地草稿是不是更新 */
  modifiedAt: number;
  /** 媒体一律是 blob URL；没有对应文件时为空 */
  trackUrl?: string;
  coverUrl?: string;
  videoUrl?: string;
  /** 能原地保存时才有 */
  save: ((content: string) => Promise<void>) | null;
};

/** 上游 EditorLoad 的查找顺序 */
const TRACK_NAMES = ['track.ogg', 'track.mp3'];
const COVER_NAMES = ['bg.jpg', 'bg.png'];
const VIDEO_NAMES = ['pv.mp4', 'bg.mp4'];
const MAIDATA_NAME = 'maidata.txt';
const ALL_NAMES = [MAIDATA_NAME, ...TRACK_NAMES, ...COVER_NAMES, ...VIDEO_NAMES];

type PickedFile = { name: string; file: File };

type FileHandleLike = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string | ArrayBuffer | Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type DirHandle = {
  name: string;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandleLike>;
};

export type PickedDir = { name: string; handle: DirHandle };

function pickFirst(files: PickedFile[], names: string[]) {
  for (const name of names) {
    const hit = files.find((item) => item.name.toLowerCase() === name);
    if (hit) return hit.file;
  }
  return undefined;
}

function objectUrl(file: File | undefined): string | undefined {
  return file ? URL.createObjectURL(file) : undefined;
}

function supportsDirectoryPicker(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

/**
 * 让用户选一个文件夹；主动取消返回 null，其他失败（权限被拒、被策略禁用等）抛出去。
 * 以前这里把两类都吞成 null，浏览器拒绝授权时页面看起来就像「点了没反应」。
 */
async function pickDirectory(): Promise<PickedDir | null> {
  const picker = (window as unknown as {
    showDirectoryPicker?: (options?: unknown) => Promise<DirHandle>;
  }).showDirectoryPicker;
  if (!picker) {
    editorWarn('picker', 'showDirectoryPicker 不存在，改用 input fallback');
    return null;
  }
  const started = performance.now();
  editorLog('picker', 'showDirectoryPicker 调用', { options: { mode: 'readwrite' }, ...activationSnapshot() });
  try {
    const handle = await picker({ mode: 'readwrite' });
    editorLog('picker', 'showDirectoryPicker 返回', { name: handle.name, ms: Math.round(performance.now() - started) });
    return { name: handle.name, handle };
  } catch (err) {
    // 按 Esc 或点右上角关闭：用户自己取消，不算错误
    if (err instanceof DOMException && err.name === 'AbortError') {
      editorLog('picker', '用户取消', { ms: Math.round(performance.now() - started) });
      return null;
    }
    editorError('picker', 'showDirectoryPicker 抛错', err, { ms: Math.round(performance.now() - started), ...activationSnapshot() });
    throw err;
  }
}

/** 回退：<input type="file" webkitdirectory>，只读 */
function pickViaInput(): Promise<{ name: string; files: File[] } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.style.display = 'none';
    let settled = false;
    const finish = (value: { name: string; files: File[] } | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };
    input.addEventListener('change', () => {
      const files = input.files ? [...input.files] : [];
      if (!files.length) return finish(null);
      // webkitRelativePath 形如 "MyChart/maidata.txt"
      const name = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] ?? 'chart';
      finish({ name, files });
    });
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

export function useChartFolder() {
  const { t } = useTranslation();

  /** 选择器报错：Chrome 在没有用户手势时会抛 SecurityError（对话框根本不出现），单独给一句提示 */
  const pickerErrorMessage = useCallback((err: unknown) => {
    if (err instanceof DOMException && err.name === 'SecurityError') return t('editor/useChartFolder.NeedGesture');
    return t('editor/useChartFolder.OpenFailed', { message: (err as Error).message });
  }, [t]);
  const [folder, setFolder] = useState<ChartFolder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** 目录选择器弹出来很久还没结果：提示用户它可能被别的窗口挡住了 */
  const [pickerSlow, setPickerSlow] = useState(false);
  /** 用户点了「取消」：放弃这次等待，选择器之后真返回了也不理它 */
  const abandonRef = useRef(false);
  /** 上一个文件夹创建的 blob URL，换文件夹时统一释放 */
  const urlsRef = useRef<string[]>([]);

  const releaseUrls = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  useEffect(() => releaseUrls, [releaseUrls]);

  /** 把一份文件列表装成 ChartFolder（媒体转 blob URL） */
  const apply = useCallback((options: {
    name: string;
    files: PickedFile[];
    maidataHandle: FileHandleLike | null;
    maidataText: string;
    modifiedAt?: number;
  }) => {
    const { name, files, maidataHandle, maidataText, modifiedAt } = options;
    const maidata = files.find((item) => item.name.toLowerCase() === MAIDATA_NAME);

    releaseUrls();
    const trackUrl = objectUrl(pickFirst(files, TRACK_NAMES));
    const coverUrl = objectUrl(pickFirst(files, COVER_NAMES));
    const videoUrl = objectUrl(pickFirst(files, VIDEO_NAMES));
    urlsRef.current = [trackUrl, coverUrl, videoUrl].filter((url): url is string => Boolean(url));

    const handle = maidataHandle;
    editorLog('editor', '装入文件夹', {
      name,
      maidataLength: maidataText.length,
      track: Boolean(trackUrl),
      cover: Boolean(coverUrl),
      video: Boolean(videoUrl),
      writable: Boolean(handle),
    });
    setFolder({
      name,
      maidata: maidataText,
      modifiedAt: modifiedAt ?? maidata?.file.lastModified ?? Date.now(),
      trackUrl,
      coverUrl,
      videoUrl,
      save: handle
        ? async (content: string) => {
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
          }
        : null,
    });
  }, [releaseUrls]);

  /** 按上游的查找顺序读一个目录里的文件 */
  const readDirectory = useCallback(async (dir: PickedDir) => {
    const files: PickedFile[] = [];
    let maidataHandle: FileHandleLike | null = null;
    for (const name of ALL_NAMES) {
      try {
        const handle = await dir.handle.getFileHandle(name);
        const file = await handle.getFile();
        files.push({ name, file });
        if (name === MAIDATA_NAME) maidataHandle = handle;
      } catch {
        /* 这个文件不存在，跳过 */
      }
    }
    editorLog('picker', '读取目录', { dir: dir.name, found: files.map((file) => file.name), hasMaidata: Boolean(maidataHandle) });
    return { files, maidataHandle };
  }, []);

  /**
   * 带“卡住提示”的选择器：Chrome 偶尔会把对话框弹到别的窗口后面，promise 就一直不 settle，
   * 界面会一直停在「打开中…」。这里超过 8 秒就把提示打开，用户可以按 Alt+Tab 找一下。
   */
  const pickWithHint = useCallback(async () => {
    abandonRef.current = false;
    setPickerSlow(false);
    const timer = setTimeout(() => {
      editorWarn('picker', '选择器 8 秒没有结果，可能被其他窗口挡住了', activationSnapshot());
      setPickerSlow(true);
    }, 8000);
    try {
      const handle = await pickDirectory();
      return abandonRef.current ? null : handle;
    } finally {
      clearTimeout(timer);
      setPickerSlow(false);
    }
  }, []);

  /** 选择器一直不出现时让用户自己脱身：放弃等待、恢复按钮 */
  const cancelPicker = useCallback(() => {
    editorLog('picker', '用户放弃等待选择器');
    abandonRef.current = true;
    setBusy(false);
    setPickerSlow(false);
  }, []);

  /**
   * 先把目录选出来（必须在用户手势里同步调用）。
   * 返回 undefined 表示这个浏览器没有目录选择器（走 webkitdirectory 回退），
   * 返回 null 表示用户取消。
   */
  const chooseFolder = useCallback(async (): Promise<PickedDir | null | undefined> => {
    if (!supportsDirectoryPicker()) return undefined;
    return pickWithHint();
  }, [pickWithHint]);

  /** 打开文件夹：读不到 maidata.txt 就报错。dir 已经选好时不再弹选择器 */
  const open = useCallback(async (preselected?: PickedDir) => {
    setBusy(true);
    setError(null);
    editorLog('editor', '打开文件夹：开始', { preselected: Boolean(preselected), supportsPicker: supportsDirectoryPicker() });
    try {
      if (!supportsDirectoryPicker()) {
        // 没有目录选择器：退回 <input webkitdirectory>（只读）
        const fallback = await pickViaInput();
        if (!fallback) return;
        const files = fallback.files.map((file) => ({ name: file.name, file }));
        const maidata = files.find((item) => item.name.toLowerCase() === MAIDATA_NAME);
        if (!maidata) {
          setError(t('editor/useChartFolder.MissingMaidata'));
          return;
        }
        apply({ name: fallback.name, files, maidataHandle: null, maidataText: await maidata.file.text() });
        return;
      }

      const dir = preselected ?? await pickWithHint();
      if (!dir) return; // 用户取消

      const { files, maidataHandle } = await readDirectory(dir);
      const maidata = files.find((item) => item.name.toLowerCase() === MAIDATA_NAME);
      if (!maidata) {
        setError(t('editor/useChartFolder.MissingMaidata'));
        return;
      }
      apply({ name: dir.name, files, maidataHandle, maidataText: await maidata.file.text() });
    } catch (err) {
      // 浏览器拒绝、句柄失效等：把原因带出来，不要静默失败
      console.error('[editor] open folder failed', err);
      setError(pickerErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [apply, pickWithHint, readDirectory, pickerErrorMessage, t]);

  /**
   * 新建：选文件夹 → 立刻检查里面有没有 track，没有就报错 →
   * 在该文件夹里建一份空 maidata.txt。
   * 没有 track 时不再自己重新弹选择器：连续弹选择器会丢掉用户手势（Chrome 直接不出对话框），
   * 让用户看完提示重新点「新建」即可。dir 已经选好时不再弹选择器。
   */
  const createNew = useCallback(async (preselected?: PickedDir) => {
    setBusy(true);
    setError(null);
    editorLog('editor', '新建谱面：开始', { preselected: Boolean(preselected), supportsPicker: supportsDirectoryPicker() });
    try {
      if (!supportsDirectoryPicker()) {
        setFolder({
          name: t('editor/EditorPage.Untitled'),
          maidata: blankMaidata(),
          modifiedAt: Date.now(),
          save: null,
        });
        return;
      }

      const dir = preselected ?? await pickWithHint();
      if (!dir) return;

      let hasTrack = false;
      for (const name of TRACK_NAMES) {
        try {
          await dir.handle.getFileHandle(name);
          hasTrack = true;
          break;
        } catch {
          /* 继续找下一个 */
        }
      }
      if (!hasTrack) {
        setError(t('editor/useChartFolder.MissingTrack'));
        return;
      }
      // 已经有 maidata.txt 就不再新建，提示用户直接打开它
      const existing = await dir.handle.getFileHandle(MAIDATA_NAME).catch(() => null);
      if (existing) {
        setError(t('editor/useChartFolder.MaidataExists'));
        return;
      }

      const blank = blankMaidata();
      const maidataHandle = await dir.handle.getFileHandle(MAIDATA_NAME, { create: true });
      const writable = await maidataHandle.createWritable();
      await writable.write(blank);
      await writable.close();

      const { files } = await readDirectory(dir);
      apply({ name: dir.name, files, maidataHandle, maidataText: blank });
    } catch (err) {
      console.error('[editor] create new chart failed', err);
      setError(pickerErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [apply, pickWithHint, readDirectory, pickerErrorMessage, t]);

  /**
   * 打开站内的在线谱面（只读）：只下载谱面文本，音轨 / 视频 / 封面直接用接口地址。
   * 没有 `save`，编辑器据此进入只读模式。
   */
  const openOnline = useCallback(async (id: string) => {
    setBusy(true);
    setError(null);
    editorLog('editor', '在线谱面：开始', { id });
    try {
      const base = endpoints.maichart.prefix(id);
      const maidata = await loadChartText(`${base}/chart`);
      releaseUrls();
      setFolder({
        name: id,
        maidata,
        modifiedAt: Date.now(),
        trackUrl: `${base}/track`,
        coverUrl: endpoints.maichart.fullImage(id),
        videoUrl: `${base}/video`,
        save: null,
      });
      editorLog('editor', '在线谱面：就绪', { id, maidataLength: maidata.length });
    } catch (err) {
      console.error('[editor] open online chart failed', err);
      setError(t('editor/useChartFolder.OpenFailed', { message: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  }, [releaseUrls, t]);

  /** 不支持原地写时，退化成下载 */
  const download = useCallback((content: string, name = 'maidata.txt') => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  return { folder, setFolder, error, busy, pickerSlow, cancelPicker, chooseFolder, open, createNew, openOnline, download };
}
