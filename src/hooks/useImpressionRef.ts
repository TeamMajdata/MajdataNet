/**
 * 曝光检查 Hook
 */
import { useCallback, useContext } from 'react';
import { ImpressionContext } from '@/contexts/impressionContextDef';

/**
 * 返回挂在卡片根元素上的 ref；只有处在 ImpressionScope 内才登记曝光，其他地方为空操作。
 */
export function useImpressionRef(hash: string) {
  const tracker = useContext(ImpressionContext);
  return useCallback((element: HTMLElement | null) => {
    if (!element || !tracker) return;
    return tracker.observe(element, hash);
  }, [tracker, hash]);
}
