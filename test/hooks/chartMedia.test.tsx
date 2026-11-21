import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChartMediaUrl } from '@/hooks/useChartMediaUrl';

const url = '/api3/api/maichart/song/image?fullImage=true';
function Cover() {
  const media = useChartMediaUrl(url);
  return <img src={media.src ?? '/thumbnail'} onError={media.onError} data-recovering={media.recovering} />;
}

describe('preview media cache recovery', () => {
  let container: HTMLDivElement;
  let root: Root;
  const fetchMedia = vi.fn<typeof fetch>();
  const revoke = vi.fn();
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('fetch', fetchMedia.mockReset());
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = () => 'blob:recovered-cover';
      static revokeObjectURL = revoke.mockClear();
    });
    container = document.createElement('div');
    root = createRoot(container);
    await act(async () => root.render(<Cover />));
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it('leaves healthy native requests alone', () => {
    expect(container.querySelector('img')?.getAttribute('src')).toBe(url);
    expect(fetchMedia).not.toHaveBeenCalled();
  });

  it('refreshes a failed resource exactly once and releases its object URL on unmount', async () => {
    fetchMedia.mockResolvedValue(new Response('image'));
    const image = container.querySelector('img')!;
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(fetchMedia).toHaveBeenCalledExactlyOnceWith(url, { cache: 'reload', signal: expect.anything() });
    expect(image.getAttribute('src')).toBe('blob:recovered-cover');
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(fetchMedia).toHaveBeenCalledTimes(1);
    await act(async () => root.render(null));
    expect(revoke).toHaveBeenCalledWith('blob:recovered-cover');
  });

  it('falls back when the resource really is missing and does not loop', async () => {
    fetchMedia.mockResolvedValue(new Response(null, { status: 404 }));
    const image = container.querySelector('img')!;
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(image.getAttribute('src')).toBe('/thumbnail');
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(fetchMedia).toHaveBeenCalledTimes(1);
  });
});
