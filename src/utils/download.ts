/**
 * 歌曲下载工具函数
 * 迁移自 legacy/src/app/download.jsx
 */

import { apiroot3 } from '@/config/api';
import JSZip from 'jszip';
import axios from 'axios';
import type { Id, toast as toastType } from 'react-toastify';

interface FetchFileParams {
  url: string;
  fileName: string;
  toast: typeof toastType;
}

async function fetchFile(
  url: string,
  fileName: string,
  toast: typeof toastType
): Promise<Blob | undefined> {
  let t: Id | undefined;
  try {
    t = toast.loading('Downloading ' + fileName, { hideProgressBar: false });
    const response = await axios.get(url, {
      responseType: 'blob',
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
  } catch (error) {
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

interface DownloadSongParams {
  id: string;
  title: string;
  toast: typeof toastType;
}

export async function downloadSong(props: DownloadSongParams): Promise<void> {
  const zip = new JSZip();

  const track = await fetchFile(
    apiroot3 + '/maichart/' + props.id + '/track',
    'track.mp3',
    props.toast
  );

  if (track === undefined) {
    props.toast.error(props.title + '下载失败');
    return;
  }

  const bg = await fetchFile(
    apiroot3 + '/maichart/' + props.id + '/image?fullImage=true',
    'bg',
    props.toast
  );

  if (bg === undefined) {
    props.toast.error(props.title + '下载失败');
    return;
  }

  const maidata = await fetchFile(
    apiroot3 + '/maichart/' + props.id + '/chart',
    'maidata',
    props.toast
  );

  if (maidata === undefined) {
    props.toast.error(props.title + '下载失败');
    return;
  }

  const video = await fetchFile(
    apiroot3 + '/maichart/' + props.id + '/video',
    'bg.mp4',
    props.toast
  );

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
