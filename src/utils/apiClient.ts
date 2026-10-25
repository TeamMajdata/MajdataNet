import { getDisplayMessage } from './httpMessage';

export class ApiError extends Error {
  readonly status: number;
  readonly code: number | undefined;
  constructor(status: number, code: number | undefined, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Read once: endpoints return JSON objects, plain challenge keys, or empty success bodies. */
export async function apiRequest<T = void>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...options });
  const text = await response.text();
  let data: unknown = text;
  if (text) {
    try { data = JSON.parse(text); } catch { /* Plain text is a valid API response. */ }
  }
  if (!response.ok) {
    const code = data && typeof data === 'object' && 'code' in data && typeof data.code === 'number'
      ? data.code : undefined;
    throw new ApiError(response.status, code, getDisplayMessage(data, `HTTP ${response.status}`));
  }
  return data as T;
}

export const apiFetcher = <T,>(url: string): Promise<T> => apiRequest<T>(url);
