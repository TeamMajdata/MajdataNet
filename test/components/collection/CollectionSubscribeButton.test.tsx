import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CollectionSubscribeButton from '@/components/collection/CollectionSubscribeButton';

const favorites = vi.hoisted(() => ({
  favoriteIds: new Set<string>(), isLoadingFavorites: false,
  toggleFavorite: vi.fn(), isPending: vi.fn(() => false),
}));
vi.mock('@/hooks', () => ({
  useFavorites: () => favorites,
  useI18n: () => ({ i18n: (_key: string, fallback: string) => fallback }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
let root = createRoot(container);
afterEach(async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
  favorites.favoriteIds.clear();
  favorites.isLoadingFavorites = false;
  vi.clearAllMocks();
  favorites.isPending.mockReturnValue(false);
});

describe('collection subscription', () => {
  it('subscribes using the collection ID and reflects subscribed state', async () => {
    const id = '69f3ace2bb1f42b84457a4f9';
    await act(async () => root.render(<CollectionSubscribeButton collectionId={id} />));
    const button = container.querySelector('button')!;
    expect(button.textContent).toBe('订阅');
    await act(async () => button.click());
    expect(favorites.toggleFavorite).toHaveBeenCalledWith(id, { added: '订阅成功', removed: '已取消订阅' });
    favorites.favoriteIds.add(id);
    await act(async () => root.render(<CollectionSubscribeButton collectionId={id} />));
    expect(button.textContent).toBe('已订阅');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['loading', 'pending'])('prevents requests while %s', async state => {
    favorites.isLoadingFavorites = state === 'loading';
    favorites.isPending.mockReturnValue(state === 'pending');
    await act(async () => root.render(<CollectionSubscribeButton collectionId="collection" />));
    const button = container.querySelector('button')!;
    expect(button.disabled).toBe(true);
    await act(async () => button.click());
    expect(favorites.toggleFavorite).not.toHaveBeenCalled();
  });
});
