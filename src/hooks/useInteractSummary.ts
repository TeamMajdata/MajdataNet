import { useContext } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { InteractSummaryContext } from '@/contexts/interactSummaryContextDef';
import { apiFetcher } from '@/utils/apiClient';
import type { ChartInteractSummary } from '@/types';

/**
 * 某张谱面的计数：列表里来自 InteractSummaryProvider 的批量请求，单独使用时自己请求一次。
 * 返回 undefined 表示仍在加载，null 表示加载失败或谱面不存在。
 */
export function useInteractSummary(chartId: string): ChartInteractSummary | undefined | null {
  const batch = useContext(InteractSummaryContext);
  const { data, error } = useSWR<ChartInteractSummary>(
    batch ? null : endpoints.maichart.interactsum(chartId),
    apiFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  if (batch) {
    if (batch.error) return null;
    if (!batch.summaries) return undefined;
    return batch.summaries.get(chartId) ?? null;
  }
  if (error) return null;
  return data;
}
