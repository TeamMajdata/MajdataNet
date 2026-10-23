/**
 * 曝光作用域 - 只有包在 ImpressionScope 内的 SongCard 才会做曝光检查并上报
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import { endpoints } from '@/config/api';
import { apiRequest } from '@/utils/apiClient';
import { ImpressionTracker } from '@/utils/impressionTracker';
import { ImpressionContext, type ImpressionSource } from './impressionContextDef';

// 统计旁路：失败直接丢弃；keepalive 让页面关闭时攒下的曝光也能发出
function sendImpressions(source: ImpressionSource, chartHashes: string[]) {
  apiRequest(endpoints.recommend.impressions, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, chartHashes }),
  }).catch(() => {});
}

export function ImpressionScope({ source, children }: { source: ImpressionSource; children: ReactNode }) {
  const tracker = useMemo(
    () => new ImpressionTracker((hashes) => sendImpressions(source, hashes)),
    [source]
  );

  useEffect(() => {
    tracker.connect();
    return () => tracker.disconnect();
  }, [tracker]);

  return <ImpressionContext.Provider value={tracker}>{children}</ImpressionContext.Provider>;
}
