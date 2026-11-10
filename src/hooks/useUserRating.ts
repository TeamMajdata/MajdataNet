import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { radarAxes } from '@/utils/radar';
import type { RatingRadarResponse } from '@/types/radar';

export class RatingRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Rating request failed (${status})`);
    this.status = status;
  }
}

const REQUIRED_FEATURES = [...radarAxes.map(axis => axis.key), 'fitted_constant'] as const;

async function fetchRating([url]: [string, string]): Promise<RatingRadarResponse> {
  const controller = new AbortController();
  // A cold request analyzes the charts that have no radar yet, so allow more than the chart radar timeout.
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'include' });
    if (!response.ok) throw new RatingRequestError(response.status);
    const value = await response.json();
    // An empty feature object is the valid "no chart could be averaged" response.
    const feature = value?.feature;
    const featureIsValid = feature && typeof feature === 'object' && !Array.isArray(feature)
      && (Object.keys(feature).length === 0
        || REQUIRED_FEATURES.every(key => typeof feature[key] === 'number' && Number.isFinite(feature[key])));
    if (!value || !Array.isArray(value.featureOrder)
      || !featureIsValid
      || !Array.isArray(value.charts)
      || !Array.isArray(value.best)
      || typeof value.scoreCount !== 'number'
      || typeof value.chartCount !== 'number') {
      throw new Error('Unexpected rating response');
    }
    return value as RatingRadarResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useUserRating(username: string | null | undefined) {
  return useSWR<RatingRadarResponse, Error>(
    username ? [endpoints.maiscore.rating(username), username] : null,
    fetchRating,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );
}