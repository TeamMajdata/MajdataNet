export const requiredMaidataMetadata = ['title', 'artist', 'des'] as const;

export type RequiredMaidataMetadata = (typeof requiredMaidataMetadata)[number];

export interface MaidataValidationResult {
  valid: boolean;
  empty: boolean;
  missingOrEmptyMetadata: RequiredMaidataMetadata[];
}

const metadataPattern = /^\s*&(title|artist|des)\s*=\s*(.*)$/i;

export function validateMaidataBytes(bytes: Uint8Array): MaidataValidationResult {
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const text = decoded.charCodeAt(0) === 0xfeff ? decoded.slice(1) : decoded;

  if (text.trim() === '') {
    return {
      valid: false,
      empty: true,
      missingOrEmptyMetadata: [],
    };
  }

  const metadataWithValue = new Set<RequiredMaidataMetadata>();

  for (const line of text.split(/\r\n|\n|\r/)) {
    const match = line.match(metadataPattern);
    if (!match || match[2].trim() === '') {
      continue;
    }

    metadataWithValue.add(match[1].toLowerCase() as RequiredMaidataMetadata);
  }

  const missingOrEmptyMetadata = requiredMaidataMetadata.filter(
    (key) => !metadataWithValue.has(key),
  );

  return {
    valid: missingOrEmptyMetadata.length === 0,
    empty: false,
    missingOrEmptyMetadata,
  };
}
