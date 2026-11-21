import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { useChartMediaUrl } from './useChartMediaUrl';
import { parseChartBpm } from '@/utils/simai';

/** maidata.txt 只有几 KB；它和音频都重定向到 CDN，不需要带登录信息 */
const fetchText = (url: string) => fetch(url).then(response => {
  if (!response.ok) throw new Error(String(response.status));
  return response.text();
});

/**
 * 谱面的 BPM（来自 maidata.txt）和时长（来自音频文件头，只读元数据、不下载整首歌）。
 * 拿不到时对应的值是 undefined，页面上就不显示那一项。
 */
export function useChartMeta(songId: string, level: number | undefined) {
  const chartUrl = endpoints.maichart.prefix(songId) + '/chart';
  const { data: maidata } = useSWR(chartUrl, fetchText, { revalidateOnFocus: false, shouldRetryOnError: false });
  const bpm = maidata === undefined ? undefined : parseChartBpm(maidata, level);

  const [duration, setDuration] = useState<{ songId: string; seconds: number }>();
  const { src: track, onError, recovering: trackRecovering } = useChartMediaUrl(endpoints.maichart.prefix(songId) + '/track');
  useEffect(() => {
    if (!track) return;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audio.addEventListener('error', onError);
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration({ songId, seconds: audio.duration });
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.src = track;
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      audio.removeAttribute('src');
      audio.load();
    };
  }, [songId, track, onError]);

  return { bpm, trackRecovering, duration: duration?.songId === songId ? duration.seconds : undefined };
}
