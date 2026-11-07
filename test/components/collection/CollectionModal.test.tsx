import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CollectionModal from '@/components/collection/CollectionModal';

const collections = vi.hoisted(() => ({
  collections: [{ id: 'collection', name: 'Favorites', createdBy: 'alice', description: null, count: 1 }],
  error: undefined, isLoading: false,
  isSongInCollection: vi.fn(() => false), toggleSongInCollection: vi.fn(), isPending: vi.fn(() => false),
  mutateCollections: vi.fn(), mutateHashLists: vi.fn(),
}));
vi.mock('@/hooks', () => ({ useCollections: () => collections }));
vi.mock('@/components', () => ({ LoadingSpinner: () => null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
let root = createRoot(container);
afterEach(async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
  vi.clearAllMocks();
});

const chartId = '0f8fad5b-d9cb-469f-a165-70867728950e';
const songHash = 'd41d8cd98f00b204e9800998ecf8427e';
const collectionButton = () =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Favorites'))!;

describe('collection modal', () => {
  it('toggles with the chart ID and checks membership by hash', async () => {
    await act(async () => root.render(<CollectionModal isOpen onClose={() => {}} chartId={chartId} songHash={songHash} />));
    expect(collections.isSongInCollection).toHaveBeenCalledWith('collection', songHash);
    await act(async () => collectionButton().click());
    expect(collections.toggleSongInCollection).toHaveBeenCalledWith('collection', { chartId, songHash });
  });

  it('cannot toggle without a chart ID', async () => {
    await act(async () => root.render(<CollectionModal isOpen onClose={() => {}} songHash={songHash} />));
    await act(async () => collectionButton().click());
    expect(collections.toggleSongInCollection).not.toHaveBeenCalled();
  });
});
