import { useCallback, useSyncExternalStore } from 'react';

const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** 媒体查询是否匹配，窗口变化时跟着更新（没有 matchMedia 的环境，比如测试，当作不匹配） */
export function useMediaQuery(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    if (!supported()) return () => {};
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => supported() && window.matchMedia(query).matches, () => false);
}
