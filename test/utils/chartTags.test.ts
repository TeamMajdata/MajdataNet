import { afterEach, describe, expect, it, vi } from 'vitest';
import { CODE_TOO_MANY_ELEMENTS } from '@/config/apiRetCode';
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

  const tooMany = () => Response.json({ code: 40002, message: 'A chart can have at most 32 tags of each kind' }, { status: 400 });
  const tagsChanged = () => Response.json({ code: -114514, message: 'The tags were changed by other requests, try again' }, { status: 409 });

  it.each(['private', 'public'] as const)('rejects %s tags over the limit with CODE_TOO_MANY_ELEMENTS', async (scope) => {
    stubFetch(tooMany());
    await expect(saveChartTags('c1', scope, [], ['A'])).rejects.toMatchObject({ status: 400, code: CODE_TOO_MANY_ELEMENTS });
  });

  it('sends a public-tag PATCH again once after a 409 and resolves to the retried result', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(tagsChanged()).mockResolvedValueOnce(Response.json(['A', 'B']));
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveChartTags('c1', 'public', ['A'], ['A', 'B'])).resolves.toEqual(['A', 'B']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([{ add: ['B'], remove: [] }, { add: ['B'], remove: [] }]);
  });

  it('gives up with the 409 when the retry loses to concurrent edits too', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => tagsChanged());
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveChartTags('c1', 'public', [], ['A'])).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 40002 refusal', async () => {
    const fetchMock = stubFetch(tooMany());
    await expect(saveChartTags('c1', 'public', [], ['A'])).rejects.toMatchObject({ code: CODE_TOO_MANY_ELEMENTS });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects on a 404 without a body', async () => {
    stubFetch(new Response(null, { status: 404 }));
    await expect(saveChartTags('missing', 'public', [], ['A'])).rejects.toMatchObject({ status: 404 });
  });
});
