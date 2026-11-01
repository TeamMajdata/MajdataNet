import { describe, expect, it } from 'vitest';
// @ts-expect-error 导入脚本是没有类型声明的 Node 脚本
import { toEventRequest, toZonedDateTime } from '../scripts/import-events.mjs';
import events from '../public/events.json';

const zonedDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

describe('events.json import', () => {
  it('completes plain dates as whole days in Beijing time', () => {
    expect(toZonedDateTime('2026-9-14', 'start')).toBe('2026-09-14T00:00:00+08:00');
    expect(toZonedDateTime('2026-10-31', 'end')).toBe('2026-10-31T23:59:59.999+08:00');
  });

  it('keeps moments that already carry an offset', () => {
    expect(toZonedDateTime('2026-10-12T23:59:59.999+08:00', 'end')).toBe('2026-10-12T23:59:59.999+08:00');
  });

  it('turns every published event into a request the backend accepts', () => {
    for (const event of events) {
      const request = toEventRequest(event);
      expect(request.createDate).toMatch(zonedDateTime);
      expect(request.endDate).toMatch(zonedDateTime);
      expect(Date.parse(request.createDate)).toBeLessThan(Date.parse(request.endDate));
      expect(typeof request.description).toBe('string');
    }
  });
});
