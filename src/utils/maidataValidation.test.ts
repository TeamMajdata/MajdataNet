import { describe, expect, it } from 'vitest';
import { validateMaidataBytes } from './maidataValidation';

const encoder = new TextEncoder();
const validMetadata = '&title=Song\n&artist=Artist\n&des=Designer';

describe('validateMaidataBytes', () => {
  it.each([
    ['zero bytes', new Uint8Array()],
    ['UTF-8 BOM only', new Uint8Array([0xef, 0xbb, 0xbf])],
    ['whitespace only', encoder.encode(' \t\r\n\n')],
  ])('treats %s as empty', (_name, bytes) => {
    expect(validateMaidataBytes(bytes)).toEqual({
      valid: false,
      empty: true,
      missingOrEmptyMetadata: [],
    });
  });

  it('accepts standard required metadata', () => {
    expect(validateMaidataBytes(encoder.encode(validMetadata))).toEqual({
      valid: true,
      empty: false,
      missingOrEmptyMetadata: [],
    });
  });

  it('accepts leading whitespace, mixed case, and spaces around equals signs', () => {
    const text = '  &TITLE = Song\n\t&Artist= Artist\n &dEs = Designer ';

    expect(validateMaidataBytes(encoder.encode(text)).valid).toBe(true);
  });

  it.each([
    ['title', '&artist=Artist\n&des=Designer'],
    ['artist', '&title=Song\n&des=Designer'],
    ['des', '&title=Song\n&artist=Artist'],
  ] as const)('reports %s when it is missing', (key, text) => {
    expect(validateMaidataBytes(encoder.encode(text)).missingOrEmptyMetadata).toEqual([key]);
  });

  it('reports metadata whose values contain only whitespace', () => {
    const text = '&title= \t\n&artist=Artist\n&des=  ';

    expect(validateMaidataBytes(encoder.encode(text)).missingOrEmptyMetadata).toEqual(['title', 'des']);
  });

  it('accepts a duplicate metadata tag when any occurrence has a value', () => {
    const text = '&title=\n&title=Song\n&artist=Artist\n&des=Designer';

    expect(validateMaidataBytes(encoder.encode(text)).valid).toBe(true);
  });

  it('rejects duplicate metadata tags when every occurrence is empty', () => {
    const text = '&title=\n&title= \n&artist=Artist\n&des=Designer';

    expect(validateMaidataBytes(encoder.encode(text)).missingOrEmptyMetadata).toEqual(['title']);
  });

  it('does not match comments, inline text, or difficulty-specific designer tags', () => {
    const text = '|| &title=Song\nprefix &artist=Artist\n&des_1=Designer';

    expect(validateMaidataBytes(encoder.encode(text)).missingOrEmptyMetadata).toEqual([
      'title',
      'artist',
      'des',
    ]);
  });

  it.each(['\n', '\r\n', '\r'])('supports %j line endings and a UTF-8 BOM', (lineEnding) => {
    const text = `\ufeff${validMetadata.replaceAll('\n', lineEnding)}`;

    expect(validateMaidataBytes(encoder.encode(text)).valid).toBe(true);
  });
});
