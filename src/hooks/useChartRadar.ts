import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { radarAxes } from '@/utils/radar';
import type { ChartRadarResponse } from '@/types/radar';

export class RadarRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Radar request failed (${status})`);
    this.status = status;
  }
}

async function fetchRadar([url]: [string, string]): Promise<ChartRadarResponse> {
  const controller = new AbortController();
  // A cold request waits for server-side analysis; there is no polling endpoint.
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new RadarRequestError(response.status);
    const value = await response.json();
    const keys = [...radarAxes.map(axis => axis.key), 'fitted_constant'];
    if (!value || !Array.isArray(value.featureOrder)
      || !value.featureOrder.every((key: unknown) => typeof key === 'string')
      || !value.feature || typeof value.feature !== 'object'
      || !keys.every(key => value.featureOrder.includes(key)
        && (value.feature[key] === null || (typeof value.feature[key] === 'number' && Number.isFinite(value.feature[key]))))) {
      throw new Error('Unexpected radar response');
    }
    return value as ChartRadarResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useChartRadar(id: string, hash: string, chartLevel: number | undefined) {
  const enabled = chartLevel !== undefined && Number.isInteger(chartLevel) && chartLevel >= 0 && chartLevel <= 6;
  return useSWR<ChartRadarResponse, Error>(
    enabled ? [endpoints.maichart.radar(id, chartLevel), hash] : null,
    fetchRadar,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );
}
