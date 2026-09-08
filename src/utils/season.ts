import type { Event } from '@/types/event';
import type { PlayHistoryRankingEntry, PlayHistoryRankingRequest, RankedSeasonEntry, SeasonChart, SeasonChartReference } from '@/types/event';


export function buildSeasonRankingRequest(event: Event, resolvedHashes?: readonly string[]): PlayHistoryRankingRequest {
  const errors = validateSeasonEvent(event);
  if (errors.length > 0 || event.category !== 5 || !event.season) {
    throw new Error(errors.length > 0 ? errors.join('; ') : 'A valid season event is required');
  }
  const references = event.season.charts.map(parseSeasonChart);
  const songhashes = resolvedHashes ? [...resolvedHashes] : references.map((chart) => chart.hash);
  if (songhashes.length !== references.length
    || !songhashes.every((hash): hash is string => typeof hash === 'string' && hash.trim() !== '' && hash === hash.trim())) {
    throw new Error('Every season chart must resolve to a valid hash before querying the ranking');
  }
  if (new Set(songhashes).size !== songhashes.length) {
    throw new Error('Resolved season chart hashes must not be duplicated');
  }
  if (references.some((chart, index) => chart.hash !== undefined && chart.hash !== songhashes[index])) {
    throw new Error('Resolved chart hash does not match the configured version');
  }
  return {
    songhashes,
    startTime: new Date(event.createDate).toISOString(),
    endTime: new Date(event.endDate).toISOString(),
    scoreType: 'best',
    sortBy: 'Acc.DX',
  };
}

/** Rank the complete result before pagination so ties survive page boundaries. */
export function rankSeasonEntries(entries: readonly PlayHistoryRankingEntry[]): RankedSeasonEntry[] {
  const ranked = entries.map((entry) => {
    if (!Number.isFinite(entry.totalAccDX) || typeof entry.playerId !== 'string') {
      throw new Error('Invalid season ranking entry');
    }
    return { ...entry, score: Number(entry.totalAccDX.toFixed(4)), rank: 0 };
  }).sort((a, b) => b.score - a.score || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));

  for (let index = 0; index < ranked.length; index += 1) {
    ranked[index].rank = index > 0 && ranked[index].score === ranked[index - 1].score
      ? ranked[index - 1].rank
      : index + 1;
  }
  return ranked;
}

export function getSeasonStatus(
  event: Pick<Event, 'createDate' | 'endDate'>,
  now: number,
): 'upcoming' | 'ongoing' | 'ended' {
  if (now < Date.parse(event.createDate)) return 'upcoming';
  if (now <= Date.parse(event.endDate)) return 'ongoing';
  return 'ended';
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Normalize both copy-pasted song links and the original ID/hash format. */
export function parseSeasonChart(input: unknown): SeasonChartReference {
  let reference = input;
  if (typeof input === 'string') {
    try {
      const url = new URL(input, 'https://majdata.net');
      if (input !== input.trim() || (!input.startsWith('/song?') && !input.startsWith('https://majdata.net/song?'))
        || url.origin !== 'https://majdata.net' || url.pathname !== '/song'
        || url.searchParams.size !== 1 || !url.searchParams.has('id') || url.hash) {
        throw new Error('invalid song link');
      }
      reference = { id: url.searchParams.get('id') };
    } catch {
      throw new Error('must be /song?id=<song id> or https://majdata.net/song?id=<song id>');
    }
  }
  if (!isRecord(reference)) throw new Error('must be a song link or an object with an id');
  if (!isNonEmptyString(reference.id) || /\s/.test(reference.id)) {
    throw new Error('id must be a non-empty string without whitespace');
  }
  if (reference.hash !== undefined
    && (!isNonEmptyString(reference.hash) || reference.hash !== reference.hash.trim())) {
    throw new Error('hash, when supplied, must be a non-empty string without surrounding whitespace');
  }
  // GUIDs identify the same song regardless of letter case.
  const id = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(reference.id)
    ? reference.id.toLowerCase() : reference.id;
  return reference.hash === undefined ? { id } : { id, hash: reference.hash };
}

function isZonedDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match;
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return Number(month) >= 1 && Number(month) <= 12
    && Number(day) >= 1 && Number(day) <= days[Number(month) - 1]
    && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
}

/** Legacy events keep their existing date and metadata conventions. */
export function validateSeasonEvent(input: unknown): string[] {
  if (!isRecord(input)) return ['event must be an object'];
  if (input.category !== 5) {
    return input.season === undefined ? [] : ['season requires category 5'];
  }

  const errors = [];
  for (const key of ['id', 'href', 'src', 'alt', 'title', 'description']) {
    if (!isNonEmptyString(input[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (isNonEmptyString(input.id) && input.id !== input.id.trim()) {
    errors.push('id must not contain leading or trailing whitespace');
  }
  if (isNonEmptyString(input.href)) {
    try {
      const url = new URL(input.href, 'https://events.invalid');
      if (!input.href.startsWith('/season?') || url.origin !== 'https://events.invalid'
        || url.pathname !== '/season' || url.searchParams.size !== 1
        || url.searchParams.get('id') !== input.id || url.hash) {
        errors.push('href must be /season?id=<encoded event id> and match id');
      }
    } catch {
      errors.push('href must be /season?id=<encoded event id> and match id');
    }
  }

  for (const key of ['createDate', 'endDate']) {
    if (!isZonedDateTime(input[key])) {
      errors.push(`${key} must be a valid ISO date-time with seconds and an explicit timezone (Z or ±HH:mm)`);
    }
  }
  if (isZonedDateTime(input.createDate) && isZonedDateTime(input.endDate)
    && Date.parse(input.createDate) >= Date.parse(input.endDate)) {
    errors.push('createDate must be earlier than endDate');
  }

  if (!isRecord(input.season) || !Array.isArray(input.season.charts) || input.season.charts.length === 0) {
    errors.push('season.charts must be a non-empty array');
    return errors;
  }
  const ids = new Set<string>();
  const hashes = new Set<string>();
  input.season.charts.forEach((chart, index) => {
    try {
      const reference = parseSeasonChart(chart);
      for (const [key, seen] of [['id', ids], ['hash', hashes]] as const) {
        const value = reference[key];
        if (value === undefined) continue;
        if (seen.has(value)) {
          errors.push(`season.charts[${index}].${key} is duplicated: ${value}`);
        } else {
          seen.add(value);
        }
      }
    } catch (error) {
      errors.push(`season.charts[${index}]: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return errors;
}

/** Every populated difficulty contributes its own best score for this file. */
export function validateSeasonChartSummary(chart: SeasonChart, summary: unknown): string[] {
  if (!isRecord(summary)) return ['chart summary must be an object'];
  let reference;
  try {
    reference = parseSeasonChart(chart);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const errors = [];
  if (summary.id !== reference.id) errors.push('chart summary id does not match the configured id');
  if (!isNonEmptyString(summary.hash) || summary.hash !== summary.hash.trim()) {
    errors.push('chart summary must contain a non-empty hash without surrounding whitespace');
  }
  if (reference.hash !== undefined && summary.hash !== reference.hash) {
    errors.push('chart hash does not match the configured version');
  }
  if (!Array.isArray(summary.levels) || !summary.levels.every((level) => level === null || typeof level === 'string')) {
    errors.push('chart summary levels must be an array of strings or null');
  }
  const levels = Array.isArray(summary.levels)
    ? summary.levels.filter((level) => typeof level === 'string' && level.trim() !== '')
    : [];
  if (levels.length === 0) {
    errors.push('chart must contain at least one non-empty difficulty');
  }
  return errors;
}

export type RequestLimiter = <T>(request: () => Promise<T>) => Promise<T>;

/** One queue bounds both metadata requests and rankings across every season. */
export function createSeasonRequestLimiter(maximum = 3): RequestLimiter {
  let active = 0;
  const queue: (() => void)[] = [];
  return <T>(request: () => Promise<T>) => new Promise<T>((resolve, reject) => {
    const start = () => {
      active += 1;
      void Promise.resolve().then(request).then(resolve, reject).finally(() => {
        active -= 1;
        queue.shift()?.();
      });
    };
    if (active < maximum) start();
    else queue.push(start);
  });
}
