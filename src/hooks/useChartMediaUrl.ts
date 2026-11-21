import { useCallback, useEffect, useState } from 'react';

/** A failed native load can be a cached CDN response originally requested without CORS. */
export function useChartMediaUrl(url: string) {
  const [failed, setFailed] = useState<string>();
  const [recovery, setRecovery] = useState<{ source: string; objectUrl?: string }>();
  const onError = useCallback(() => setFailed(url), [url]);

  useEffect(() => {
    if (failed !== url) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;

    async function retry() {
      try {
        // Refresh the HTTP cache as well: Unity continues to request its normal API URLs.
        const response = await fetch(url, { cache: 'reload', signal: controller.signal });
        if (response.ok) {
          const blob = await response.blob();
          if (!controller.signal.aborted) objectUrl = URL.createObjectURL(blob);
        }
      } catch {
        // The original file may actually be unavailable. Finish once and allow the caller's fallback.
      }
      if (!controller.signal.aborted) setRecovery({ source: url, objectUrl });
    }
    void retry();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [failed, url]);

  const result = recovery?.source === url ? recovery : undefined;
  return {
    src: result ? result.objectUrl : url,
    recovering: failed === url && !result,
    onError,
  };
}
