import { describe, expect, it } from 'vitest';
import { buildSuggestions } from '@/utils/searchSuggestions';

const songs = [
  { title: '<color=red>Glory</color> MAX', artist: 'TAK', designer: 'LiTANiA', uploader: 'Mmmmk', tags: [], publicTags: ['OTOGE'] },
  { title: 'Lament Rain', artist: 'Ashrount', designer: 'zzz', uploader: 'zouzouzou', tags: ['glow'], publicTags: [] },
  { title: 'glory MAX -to the top-', artist: 'TAK', designer: 'LiTANiA', uploader: 'Mmmmk', tags: [], publicTags: [] },
];

describe('buildSuggestions', () => {
  it('matches titles without rich-text tags, prefix matches first, deduped per kind', () => {
    expect(buildSuggestions('glo', songs)).toEqual([
      { kind: 'title', label: 'Glory MAX', value: 'Glory MAX' },
      { kind: 'title', label: 'glory MAX -to the top-', value: 'glory MAX -to the top-' },
      { kind: 'tag', label: 'glow', value: 'tag:glow' },
    ]);
  });

  it('fills uploader and tag suggestions with their search operator', () => {
    expect(buildSuggestions('mmm', songs)).toEqual([{ kind: 'uploader', label: 'Mmmmk', value: 'uploader:Mmmmk' }]);
    expect(buildSuggestions('oto', songs)).toEqual([{ kind: 'tag', label: 'OTOGE', value: 'tag:OTOGE' }]);
  });

  it('limits an operator query to its own field', () => {
    expect(buildSuggestions('uploader:zou', songs)).toEqual([{ kind: 'uploader', label: 'zouzouzou', value: 'uploader:zouzouzou' }]);
    expect(buildSuggestions('tag:', songs)).toEqual([]);
  });

  it('returns nothing for empty, id: or hash: queries and honours the limit', () => {
    expect(buildSuggestions('  ', songs)).toEqual([]);
    expect(buildSuggestions('id:abc', songs)).toEqual([]);
    expect(buildSuggestions('a', songs, 2)).toHaveLength(2);
  });
});
