import { describe, expect, it } from 'vitest';
import { endpoints } from '@/config/api';

describe('endpoints.maiscore', () => {
  it('builds the chart leaderboard by chart id', () => {
    expect(endpoints.maiscore.chartLeaderboard('3f2504e0-4f89-11d3-9a0c-0305e82c3301'))
      .toBe('/api3/api/maiscore/leaderboard/chart/by-id/3f2504e0-4f89-11d3-9a0c-0305e82c3301');
  });

  it('builds the level leaderboard by level hash', () => {
    const levelHash = '0123456789abcdef'.repeat(4);
    expect(endpoints.maiscore.levelLeaderboard(levelHash))
      .toBe(`/api3/api/maiscore/leaderboard/chart/by-level/${levelHash}`);
  });

  it('escapes the level hash as a single path segment', () => {
    expect(endpoints.maiscore.levelLeaderboard('a/b c?d'))
      .toBe('/api3/api/maiscore/leaderboard/chart/by-level/a%2Fb%20c%3Fd');
  });
});
