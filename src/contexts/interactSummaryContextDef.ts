import { createContext } from 'react';
import type { ChartInteractSummary } from '@/types';

/** 一页列表共用的批量计数：undefined 仍在加载，error 非空表示请求失败。 */
export interface InteractSummaryContextValue {
  summaries: Map<string, ChartInteractSummary> | undefined;
  error: unknown;
}

export const InteractSummaryContext = createContext<InteractSummaryContextValue | null>(null);
