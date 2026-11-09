import { expect, test } from '@playwright/test';
import type { Page, Request } from '@playwright/test';

const collectionId = '6a70107b8d6a8b09dbb5e8aa';
const chartA = '11111111-1111-4111-8111-111111111111';
const chartB = '22222222-2222-4222-8222-222222222222';
const chartC = '33333333-3333-4333-8333-333333333333';
const missingChart = '99999999-9999-4999-8999-999999999999';
const titles: Record<string, string> = { [chartA]: 'Alpha fixture', [chartB]: 'Bravo fixture', [chartC]: 'Charlie fixture' };
// A 1×1 transparent PNG: covers and avatars load without depending on any file in public/.
const placeholderImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** One item of `POST /api/maichart/info`, shaped like the backend's `OnlineChartInfo`. */
const chartInfo = (id: string) => ({
  metadata: {
    id,
    title: titles[id],
    artist: 'Acceptance fixture',
    uploader: 'owner',
    designer: 'Test designer',
    levels: ['3', '6', '9', '12', null, null, null],
    hash: `hash-${id}`,
    tags: [],
    publicTags: [],
    timestamp: '2026-09-20T00:00:00Z',
  },
  resources: {},
  levelHashes: [null, null, null, null, null, null, null],
});

interface MockOptions {
  /** Chart ids the songlist returns, in collection order. */
  items: string[];
  /** Username the session reports; the page needs a logged-in user, and only the creator `owner` can edit. */
  username?: string;
}

/**
 * Mocks the backend for the collection page. Returns every API request the page sends, so tests can check that the
 * removed `diff` endpoint is never called.
 */
async function mockApi(page: Page, { items, username = 'viewer' }: MockOptions) {
  const requests: Request[] = [];
  let currentItems = items;
  await page.route('**/api3/**', async (route) => {
    const request = route.request();
    requests.push(request);
    const path = new URL(request.url()).pathname;
    const collection = () => ({
      id: collectionId,
      name: 'E2E playlist',
      createdBy: 'owner',
      description: 'Collection fixture',
      visibility: 1,
      // The backend lists the charts that still exist.
      items: currentItems.filter((id) => id !== missingChart),
      count: currentItems.filter((id) => id !== missingChart).length,
    });
    if (path.endsWith('/image') || path.includes('/avatar/')) {
      await route.fulfill({ body: placeholderImage, contentType: 'image/png' });
      return;
    }
    if (path.endsWith(`/collection/${collectionId}/songlist`)) {
      await route.fulfill({ json: collection() });
      return;
    }
    if (path.endsWith('/maichart/info') && request.method() === 'POST') {
      // Answer in reverse request order and leave out missing charts, as the real endpoint may.
      const ids = request.postDataJSON() as string[];
      await route.fulfill({ json: ids.filter((id) => titles[id]).reverse().map(chartInfo) });
      return;
    }
    if (path.endsWith(`/collection/${collectionId}/modify`) && request.method() === 'PUT') {
      currentItems = (request.postDataJSON() as { items?: string[] }).items ?? currentItems;
      await route.fulfill({ json: { code: 0, message: 'Ok', collection: collection() } });
      return;
    }
    if (path.endsWith('/maichart/interactsum')) {
      const chartIds = request.postDataJSON() as string[];
      await route.fulfill({ json: chartIds.map((chartId) => ({ chartId, plays: 0, score: 0, upvotes: 0, downvotes: 0, comments: 0, myVote: 0 })) });
      return;
    }
    const body = path.endsWith('/account/profile') ? { username }
      : path.endsWith('/interactsum') ? { chartId: path.split('/').at(-2), plays: 0, score: 0, upvotes: 0, downvotes: 0, comments: 0, myVote: 0 }
        : [];
    await route.fulfill({ json: body });
  });
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  return requests;
}

const songTitles = (page: Page) => page.locator('main').getByText(/^(Alpha|Bravo|Charlie) fixture$/);

test('desktop: collection page loads chart metadata in one batch, in collection order', async ({ page }) => {
  const requests = await mockApi(page, { items: [chartB, chartA] });

  await page.goto(`/collection?id=${collectionId}`);

  await expect(songTitles(page)).toHaveText(['Bravo fixture', 'Alpha fixture']);
  const infoRequests = requests.filter((r) => r.url().endsWith('/maichart/info'));
  expect(infoRequests).toHaveLength(1);
  expect(infoRequests[0].postDataJSON()).toEqual([chartB, chartA]);
  expect(requests.some((r) => r.url().includes('/diff'))).toBe(false);
});

test('desktop: an empty collection sends no chart info request', async ({ page }) => {
  const requests = await mockApi(page, { items: [] });

  await page.goto(`/collection?id=${collectionId}`);

  await expect(page.getByText('E2E playlist')).toBeVisible();
  await expect(songTitles(page)).toHaveCount(0);
  expect(requests.some((r) => r.url().endsWith('/maichart/info'))).toBe(false);
});

test('desktop: the owner saves edits with PUT modify and the full item list', async ({ page }) => {
  const requests = await mockApi(page, { items: [chartB, chartA, chartC], username: 'owner' });
  await page.goto(`/collection?id=${collectionId}`);
  await expect(songTitles(page)).toHaveText(['Bravo fixture', 'Alpha fixture', 'Charlie fixture']);

  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await page.getByTitle('Remove from Collection').nth(1).click();
  const modify = page.waitForRequest((r) => r.url().endsWith(`/collection/${collectionId}/modify`));
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  const request = await modify;
  expect(request.method()).toBe('PUT');
  expect(request.postDataJSON()).toEqual({ items: [chartB, chartC] });
  await expect(songTitles(page)).toHaveText(['Bravo fixture', 'Charlie fixture']);
  expect(requests.some((r) => r.url().includes('/diff'))).toBe(false);
});
