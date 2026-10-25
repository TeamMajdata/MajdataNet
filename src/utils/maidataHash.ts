import { md5 } from 'js-md5';

export function getFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function addUnique<T>(items: T[], item: T) {
  if (!items.includes(item)) {
    items.push(item);
  }
}

function normalizeLines(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function encodeUtf8(text: string) {
  return new TextEncoder().encode(text);
}

export function hashCandidatesFromBytes(bytes: Uint8Array) {
  const candidates: string[] = [];
  const add = (value: Uint8Array | ArrayBuffer | number[]) => {
    addUnique(candidates, md5.base64(value));
  };

  add(bytes);

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    add(bytes.slice(3));
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(bytes);
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const normalized = normalizeLines(text);

  add(encodeUtf8(normalized));
  add(encodeUtf8(normalized.split('\n').filter((line) => line.trim() !== '').join('\n')));

  const nonBlank = normalized.split('\n').filter((line) => line.trim() !== '');
  const firstLevelIndex = nonBlank.findIndex((line) => line.trimStart().toLowerCase().startsWith('&lv_'));
  if (firstLevelIndex !== -1) {
    const normalizedLevelGap = [
      ...nonBlank.slice(0, firstLevelIndex),
      '',
      ...nonBlank.slice(firstLevelIndex),
    ].join('\n');
    add(encodeUtf8(normalizedLevelGap));
  }

  add(encodeUtf8(rawText.replace(/\n/g, '\r\n')));

  return candidates;
}
