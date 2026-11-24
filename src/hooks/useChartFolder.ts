/**
 * 读取用户本地的一个谱面文件夹（maidata.txt + track + bg + pv）。
 *
 * 优先用 File System Access API（可以原地保存）；不支持时回退到 <input webkitdirectory>
 * （只读，保存走下载）。两条路径最后都归一到同一份 `ChartFolder`，页面不用区分。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

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

type PickedFile = { name: string; file: File };

type DirHandle = {
  name: string;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandleLike>;
};

type FileHandleLike = {
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
};

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

/** 让用户选一个文件夹；用户取消返回 null */
async function pickDirectory(): Promise<{ name: string; handle: DirHandle } | null> {
  const picker = (window as unknown as {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<DirHandle>;
  }).showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ mode: 'readwrite' });
    return { name: handle.name, handle };
  } catch {
    return null;
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
  const [folder, setFolder] = useState<ChartFolder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** 上一个文件夹创建的 blob URL，换文件夹时统一释放 */
  const urlsRef = useRef<string[]>([]);

  const releaseUrls = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  useEffect(() => releaseUrls, [releaseUrls]);

  const open = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      let picked: PickedFile[] | null = null;
      let name = '';
      let maidataHandle: FileHandleLike | null = null;

      const dir = await pickDirectory();
      if (dir) {
        const allowed = ['maidata.txt', ...TRACK_NAMES, ...COVER_NAMES, ...VIDEO_NAMES];
        picked = [];
        for (const fileName of allowed) {
          try {
            const handle = await dir.handle.getFileHandle(fileName);
            picked.push({ name: fileName, file: await handle.getFile() });
            if (fileName === 'maidata.txt') maidataHandle = handle;
          } catch {
            /* 这个文件不存在，跳过 */
          }
        }
        name = dir.name;
      } else {
        // 用户可能在第一个 picker 里点了取消，也可能浏览器不支持
        const fallback = await pickViaInput();
        if (!fallback) return;
        picked = fallback.files.map((file) => ({ name: file.name, file }));
        name = fallback.name;
      }

      const maidata = picked.find((item) => item.name.toLowerCase() === 'maidata.txt');
      if (!maidata) {
        setError('这个文件夹里没有 maidata.txt');
        return;
      }

      releaseUrls();
      const trackUrl = objectUrl(pickFirst(picked, TRACK_NAMES));
      const coverUrl = objectUrl(pickFirst(picked, COVER_NAMES));
      const videoUrl = objectUrl(pickFirst(picked, VIDEO_NAMES));
      urlsRef.current = [trackUrl, coverUrl, videoUrl].filter((url): url is string => Boolean(url));

      const handle = maidataHandle;
      setFolder({
        name,
        maidata: await maidata.file.text(),
        modifiedAt: maidata.file.lastModified,
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [releaseUrls]);

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

  return { folder, setFolder, error, busy, open, download };
}
