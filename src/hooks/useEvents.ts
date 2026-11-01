import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { Event } from '@/types/event';
import { apiFetcher } from '@/utils/apiClient';
import bundledEvents from '../../public/events.json';

// 过渡期的回退数据：后端还没有 api/event（线上未部署）或请求失败时使用。
// api/event 上线并完成导入后，可以删掉这份回退和 public/events.json。
const fallbackEvents = bundledEvents as Event[];
const noEvents: Event[] = [];

export interface EventsState {
  events: Event[];
  isLoading: boolean;
}

/** 网站上的全部活动，来自 api/event；加载中返回空列表，失败时回退到打包的 events.json。 */
export function useEvents(): EventsState {
  const { data, error } = useSWR<Event[]>(endpoints.event.list, apiFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  if (data) return { events: data, isLoading: false };
  if (error) return { events: fallbackEvents, isLoading: false };
  return { events: noEvents, isLoading: true };
}
