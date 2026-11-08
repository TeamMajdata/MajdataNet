import { afterEach, describe, expect, it, vi } from 'vitest';
import { diffChartTags, saveChartTags } from '@/utils/chartTags';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('diffChartTags', () => {
  it('lists only added and removed tags', () => {
    expect(diffChartTags(['A', 'B', 'C'], ['B', 'D', 'C'])).toEqual({ add: ['D'], remove: ['A'] });
  });

  it('never puts a tag in both lists, so the backend 400 for overlapping lists cannot happen', () => {
    // Removed and then added back, plus a duplicate add: nothing changed.
    expect(diffChartTags(['A', 'B'], ['B', 'A', 'A'])).toEqual({ add: [], remove: [] });
  });

  it('is case-sensitive like the backend', () => {
    expect(diffChartTags(['pops'], ['POPS'])).toEqual({ add: ['POPS'], remove: ['pops'] });
  });
});

describe('saveChartTags', () => {
  it('replaces private tags with PUT and resolves to the tags the server holds', async () => {
    const fetchMock = stubFetch(Response.json(['x', 'y']));
    await expect(saveChartTags('c 1', 'private', ['x'], ['x', 'y'])).resolves.toEqual(['x', 'y']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api3/api/maichart/c 1/tags');
    expect(init).toMatchObject({ method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(String(init?.body))).toEqual(['x', 'y']);
  });

  it('clears private tags with an empty PUT body', async () => {
    const fetchMock = stubFetch(Response.json([]));
    await expect(saveChartTags('c1', 'private', ['x'], [])).resolves.toEqual([]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual([]);
  });

  it('sends only this edit of public tags with PATCH, keeping tags others added meanwhile', async () => {
    const fetchMock = stubFetch(Response.json(['B', 'Other', 'POPS']));
    await expect(saveChartTags('c1', 'public', ['A', 'B'], ['B', 'POPS'])).resolves.toEqual(['B', 'Other', 'POPS']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api3/api/maichart/c1/publictags');
    expect(init).toMatchObject({ method: 'PATCH', credentials: 'include' });
    expect(JSON.parse(String(init?.body))).toEqual({ add: ['POPS'], remove: ['A'] });
  });

  it('rejects with the backend code when the server refuses the edit', async () => {
    stubFetch(Response.json({ code: 40000, message: 'A tag cannot be both added and removed' }, { status: 400 }));
    await expect(saveChartTags('c1', 'public', [], ['A'])).rejects.toMatchObject({
      status: 400, code: 40000, message: 'A tag cannot be both added and removed',
    });
  });

  it('rejects on a 404 without a body', async () => {
    stubFetch(new Response(null, { status: 404 }));
    await expect(saveChartTags('missing', 'public', [], ['A'])).rejects.toMatchObject({ status: 404 });
  });
});
