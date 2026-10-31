/**
 * 一页谱面列表共用一次 interactsum 批量请求，卡片通过 useInteractSummary 读自己的计数，不再逐张请求。
 */

import type { ReactNode } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { InteractSummaryContext } from '@/contexts/interactSummaryContextDef';
import { apiRequest, jsonRequest } from '@/utils/apiClient';
import type { ChartInteractSummary } from '@/types';

const batchFetcher = async ([, ids]: [string, string[]]) => {
  const list = await apiRequest<ChartInteractSummary[]>(endpoints.maichart.interactsumBatch, jsonRequest('POST', ids));
  return new Map(list.map((summary) => [summary.chartId, summary]));
};

export default function InteractSummaryProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const { data, error } = useSWR(ids.length > 0 ? ['interactsum', ids] : null, batchFetcher, {
    revalidateOnFocus: false,
  });
  return <InteractSummaryContext.Provider value={{ summaries: data, error }}>{children}</InteractSummaryContext.Provider>;
}
