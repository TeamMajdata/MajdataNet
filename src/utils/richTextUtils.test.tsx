import { describe, it, expect } from 'vitest';
import { hasTmpTags, stripTmpTags, parseTmpRichText } from '@/utils/richTextUtils';
import type { ReactElement } from 'react';

// Test string from the user
const SONG_TITLE =
  '<color=#FF5AFB>E</color><color=#58C6FF>x</color><color=#404040>-</color>Otogibanashi   <color=#D13B40>[Full Ver.|3:37]</color>';

// ======================== hasTmpTags ========================

describe('hasTmpTags', () => {
  it('returns false for plain text', () => {
    expect(hasTmpTags('Hello World')).toBe(false);
    expect(hasTmpTags('普通文本')).toBe(false);
    expect(hasTmpTags('')).toBe(false);
  });

  it('returns true for TMP color tags', () => {
    expect(hasTmpTags('<color=#FF0000>Red</color>')).toBe(true);
  });

  it('returns true for nested tags', () => {
    expect(hasTmpTags('<b><i>Bold Italic</i></b>')).toBe(true);
  });

  it('returns true for the song title test case', () => {
    expect(hasTmpTags(SONG_TITLE)).toBe(true);
  });
});

// ======================== stripTmpTags ========================

describe('stripTmpTags', () => {
  it('returns plain text unchanged', () => {
    expect(stripTmpTags('Hello World')).toBe('Hello World');
  });

  it('removes TMP tags and keeps inner text', () => {
    expect(stripTmpTags('<color=#FF0000>Red</color>')).toBe('Red');
  });

  it('strips the song title correctly', () => {
    expect(stripTmpTags(SONG_TITLE)).toBe('Ex-Otogibanashi   [Full Ver.|3:37]');
  });

  it('handles empty string', () => {
    expect(stripTmpTags('')).toBe('');
  });
});

// ======================== parseTmpRichText ========================

describe('parseTmpRichText', () => {
  it('returns plain string when no tags are present', () => {
    const result = parseTmpRichText('Hello World');
    expect(result).toBe('Hello World');
  });

  it('returns empty string for empty input', () => {
    expect(parseTmpRichText('')).toBe('');
  });

  it('parses a single color tag into a span with correct style', () => {
    const result = parseTmpRichText('<color=#FF0000>Red Text</color>');
    expect(Array.isArray(result)).toBe(true);
    const arr = result as ReactElement[];
    expect(arr).toHaveLength(1);
    expect(arr[0].type).toBe('span');
    expect(arr[0].props.style).toEqual({ color: '#FF0000' });
  });

  it('renders the "E" span with color #FF5AFB', () => {
    const result = parseTmpRichText(SONG_TITLE);
    expect(Array.isArray(result)).toBe(true);
    const arr = result as ReactElement[];

    expect(arr[0].type).toBe('span');
    expect(arr[0].props.style).toEqual({ color: '#FF5AFB' });
    expect(arr[0].props.children).toBe('E');
  });

  it('renders the "x" span with color #58C6FF', () => {
    const result = parseTmpRichText(SONG_TITLE);
    const arr = result as ReactElement[];

    expect(arr[1].type).toBe('span');
    expect(arr[1].props.style).toEqual({ color: '#58C6FF' });
    expect(arr[1].props.children).toBe('x');
  });

  it('renders the "-" span with color #404040', () => {
    const result = parseTmpRichText(SONG_TITLE);
    const arr = result as ReactElement[];

    expect(arr[2].type).toBe('span');
    expect(arr[2].props.style).toEqual({ color: '#404040' });
    expect(arr[2].props.children).toBe('-');
  });

  it('renders plain text "Otogibanashi   " between tags', () => {
    const result = parseTmpRichText(SONG_TITLE);
    const arr = result as ReactElement[];

    expect(arr[3]).toBe('Otogibanashi   ');
  });

  it('renders the "[Full Ver.|3:37]" span with color #D13B40', () => {
    const result = parseTmpRichText(SONG_TITLE);
    const arr = result as ReactElement[];

    expect(arr[4].type).toBe('span');
    expect(arr[4].props.style).toEqual({ color: '#D13B40' });
    expect(arr[4].props.children).toBe('[Full Ver.|3:37]');
  });

  it('produces exactly 5 top-level children for the song title', () => {
    const result = parseTmpRichText(SONG_TITLE);
    const arr = result as ReactElement[];
    expect(arr).toHaveLength(5);
  });
});

// ======================== Nested & edge cases ========================

describe('parseTmpRichText nested tags', () => {
  it('handles nested bold+italic', () => {
    const result = parseTmpRichText('<b><i>Bold Italic</i></b>');
    const arr = result as ReactElement[];

    expect(arr).toHaveLength(1);
    expect(arr[0].type).toBe('span');
    expect(arr[0].props.style).toMatchObject({ fontWeight: 'bold' });
    // Inner span — single child is stored directly, not in array
    const inner = arr[0].props.children as ReactElement;
    expect(inner.type).toBe('span');
    expect(inner.props.style).toMatchObject({ fontStyle: 'italic' });
    expect(inner.props.children).toContain('Bold Italic');
  });

  it('falls back to stripped text on malformed input', () => {
    // Missing closing tag — still parses because the tree builder auto-closes
    const result = parseTmpRichText('<color=#FF0000>Unclosed');
    expect(result).toBeTruthy(); // should not crash
  });

  it('handles tags with quoted values', () => {
    const result = parseTmpRichText('<color="#00FF00">Green</color>');
    const arr = result as ReactElement[];
    expect(arr[0].type).toBe('span');
    expect(arr[0].props.style).toEqual({ color: '#00FF00' });
  });

  it('handles size tags', () => {
    const result = parseTmpRichText('<size=+4>Bigger</size>');
    const arr = result as ReactElement[];
    expect(arr[0].type).toBe('span');
    expect(arr[0].props.style).toHaveProperty('fontSize');
  });
});
