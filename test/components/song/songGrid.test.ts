import { describe, expect, it } from 'vitest';
import { API_PAGE_SIZE, API_PAGES_PER_VIEW, apiPagesForView } from '@/components/song/songGrid';

describe('apiPagesForView', () => {
  it('maps each view to consecutive API pages', () => {
    expect(apiPagesForView(0)).toEqual([0, 1]);
    expect(apiPagesForView(3)).toEqual([6, 7]);
  });

  it('fills every grid width with complete rows', () => {
    const perView = API_PAGE_SIZE * API_PAGES_PER_VIEW;
    for (const columns of [1, 2, 3, 4]) expect(perView % columns).toBe(0);
  });
});
