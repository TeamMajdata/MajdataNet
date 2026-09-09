import type { Event } from '@/types/event';
import type { PlayHistoryRankingEntry, PlayHistoryRankingRequest, RankedSeasonEntry } from '@/types/event';


export function buildSeasonRankingRequest(event: Event, resolvedHashes: readonly string[]): PlayHistoryRankingRequest {
  const errors = validateSeasonEvent(event);
  if (errors.length > 0 || event.type !== 'season') {
    throw new Error(errors.length > 0 ? errors.join('; ') : 'A valid season event is required');
  }
  const songhashes = [...resolvedHashes];
  if (songhashes.length === 0
    || !songhashes.every((hash): hash is string => typeof hash === 'string' && hash.trim() !== '' && hash === hash.trim())) {
    throw new Error('Every season chart must resolve to a valid hash before querying the ranking');
  }
  if (new Set(songhashes).size !== songhashes.length) {
    throw new Error('Resolved season chart hashes must not be duplicated');
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

/** Extract the song ID from the links resolved from the collection. */
export function parseSeasonChart(input: unknown): string {
  if (typeof input === 'string' && input === input.trim()) {
    const url = new URL(input, 'https://majdata.net');
    const id = url.searchParams.get('id');
    if ((input.startsWith('/song?') || input.startsWith('https://majdata.net/song?'))
      && url.origin === 'https://majdata.net' && url.pathname === '/song'
      && url.searchParams.size === 1 && !url.hash && id && !/\s/.test(id)) {
      // GUIDs identify the same song regardless of letter case.
      return /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id) ? id.toLowerCase() : id;
    }
  }
  throw new Error('must be /song?id=<song id> or https://majdata.net/song?id=<song id>');
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
  if (input.type !== 'season') {
    return input.season === undefined ? [] : ['season requires type season'];
  }

  const errors = [];
  for (const key of ['id', 'asset', 'src', 'alt', 'title', 'description']) {
    if (!isNonEmptyString(input[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (isNonEmptyString(input.id) && input.id !== input.id.trim()) {
    errors.push('id must not contain leading or trailing whitespace');
  }
  if (isNonEmptyString(input.asset) && !/^[a-f\d]{24}$/i.test(input.asset)) {
    errors.push('season asset must be a collection ID');
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
