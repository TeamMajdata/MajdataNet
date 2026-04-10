const HTML_PATTERN = /<[a-z!/][\s\S]*>/i;

function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clampMessage(value: string, maxLength = 180): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractTextFromHtml(value: string): string | null {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const document = new DOMParser().parseFromString(value, 'text/html');
  const candidates = [
    document.title,
    document.querySelector('h1')?.textContent,
    document.querySelector('h2')?.textContent,
    document.body?.textContent,
  ];

  for (const candidate of candidates) {
    const message = normalizeMessage(candidate || '');
    if (message) {
      return clampMessage(message);
    }
  }

  return null;
}

function extractObjectMessage(value: Record<string, unknown>): string | null {
  for (const key of ['message', 'error', 'detail', 'title']) {
    const candidate = value[key];
    if (typeof candidate === 'string') {
      const message = normalizeMessage(candidate);
      if (message) {
        return clampMessage(message);
      }
    }
  }

  return null;
}

export function getDisplayMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = normalizeMessage(value);
    if (!trimmed) {
      return fallback;
    }

    if (HTML_PATTERN.test(trimmed)) {
      return extractTextFromHtml(trimmed) || fallback;
    }

    return clampMessage(trimmed);
  }

  if (value instanceof Error) {
    const message = normalizeMessage(value.message);
    return message ? clampMessage(message) : fallback;
  }

  if (value && typeof value === 'object') {
    return extractObjectMessage(value as Record<string, unknown>) || fallback;
  }

  return fallback;
}