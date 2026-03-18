import { apiroot3 } from '@/config/api';
import JSZip from 'jszip';
import axios from 'axios';
import type { Id, toast as toastType } from 'react-toastify';
import type { DownloadSongParams } from '@/types/download';

async function fetchFile(
  url: string,
  fileName: string,
  toast: typeof toastType,
  signal?: AbortSignal
): Promise<Blob | undefined> {
  let t: Id | undefined;
  try {
    t = toast.loading('Downloading ' + fileName, { hideProgressBar: false });
    const response = await axios.get(url, {
      responseType: 'blob',
      signal,
      onDownloadProgress: function (progressEvent) {
        if (progressEvent.lengthComputable && progressEvent.total) {
          const progress = progressEvent.loaded / progressEvent.total;
          if (t) {
            toast.update(t, { progress });
          }
        }
      },
    });
    if (t) toast.done(t);
    return response.data;
  } catch {
    if (t) toast.done(t);
    return undefined;
  }
}

function downloadFile(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadSong(props: DownloadSongParams): Promise<void> {
  const zip = new JSZip();
  const abortController = new AbortController();
  const prefix = apiroot3 + '/maichart/' + props.id;

  const trackPromise = fetchFile(
    prefix + '/track',
    'track.mp3',
    props.toast,
    abortController.signal
  ).then((result) => {
    if (result === undefined) {
      abortController.abort();
    }
    return result;
  });

  const bgPromise = fetchFile(
    prefix + '/image?fullImage=true',
    'bg',
    props.toast,
    abortController.signal
  ).then((result) => {
    if (result === undefined) {
      abortController.abort();
    }
    return result;
  });

  const maidataPromise = fetchFile(
    prefix + '/chart',
    'maidata',
    props.toast,
    abortController.signal
  ).then((result) => {
    if (result === undefined) {
      abortController.abort();
    }
    return result;
  });

  const videoPromise = fetchFile(
    prefix + '/video',
    'bg.mp4',
    props.toast,
    abortController.signal
  );

  const [track, bg, maidata, video] = await Promise.all([
    trackPromise,
    bgPromise,
    maidataPromise,
    videoPromise,
  ]);

  if (track === undefined || bg === undefined || maidata === undefined) {
    props.toast.error(props.title + '下载失败');
    return;
  }

  zip.file('track.mp3', track);
  zip.file('bg.jpg', bg);
  zip.file('maidata.txt', maidata);

  if (video !== undefined) {
    zip.file('pv.mp4', video);
  }

  let downloadExtension = localStorage.getItem('DownloadType');
  if (downloadExtension === null || downloadExtension === undefined) {
    downloadExtension = 'zip';
  }

  zip.generateAsync({ type: 'blob' }).then((blob) => {
    const blb = new Blob([blob], { type: 'application/' + downloadExtension });
    const url = window.URL.createObjectURL(blb);
    props.toast.success(props.title + '下载成功');
    downloadFile(url, props.title + '.' + downloadExtension);
  });
}
