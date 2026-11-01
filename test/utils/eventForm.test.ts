import { describe, expect, it } from 'vitest';
import type { Event } from '@/types/event';
import {
  emptyEventForm, fromBeijingInput, toBeijingInput, toEventForm, toEventRequest, validateEventForm,
  type EventFormValues,
} from '@/utils/eventForm';

const event: Event = {
  id: 'mmfc15', type: 'space', asset: 'MMFC15', src: '/events/mmfc15.jpg', alt: 'MMFC 15', title: 'MMFC 15',
  category: 2, createDate: '2026-10-31T16:00:00Z', endDate: '2026-12-01T15:59:59.999Z', description: '',
};
const valid: EventFormValues = toEventForm(event);

describe('event form', () => {
  it('edits times as Beijing time whatever the browser time zone', () => {
    expect(toBeijingInput('2026-10-31T16:00:00Z')).toBe('2026-11-01T00:00:00');
    expect(toBeijingInput('not a date')).toBe('');
    expect(fromBeijingInput('2026-11-01T00:00:00')).toBe('2026-11-01T00:00:00+08:00');
    // Browsers drop zero seconds from datetime-local values.
    expect(fromBeijingInput('2026-11-01T00:00')).toBe('2026-11-01T00:00:00+08:00');
    expect(validateEventForm({ ...valid, end: '2026-12-01T23:59:59.000' })).toEqual({});
  });

  it('round-trips an event into the request the backend accepts', () => {
    expect(valid).toMatchObject({ start: '2026-11-01T00:00:00', end: '2026-12-01T23:59:59' });
    expect(toEventRequest({ ...valid, title: '  MMFC 15  ' })).toEqual({
      ...event, createDate: '2026-11-01T00:00:00+08:00', endDate: '2026-12-01T23:59:59+08:00',
    });
    expect(validateEventForm(valid)).toEqual({});
  });

  it('reports every missing required field of a new event', () => {
    expect(validateEventForm({ ...emptyEventForm(), src: ' ' })).toEqual({
      id: 'admin/EventsAdminPage.ErrorRequired',
      asset: 'admin/EventsAdminPage.ErrorRequired',
      src: 'admin/EventsAdminPage.ErrorRequired',
      alt: 'admin/EventsAdminPage.ErrorRequired',
      title: 'admin/EventsAdminPage.ErrorRequired',
      start: 'admin/EventsAdminPage.ErrorRequired',
      end: 'admin/EventsAdminPage.ErrorRequired',
    });
  });

  it('applies the rules of the backend validator', () => {
    expect(validateEventForm({ ...valid, id: '-mmfc' }).id).toBe('admin/EventsAdminPage.ErrorId');
    expect(validateEventForm({ ...valid, id: 'a'.repeat(65) }).id).toBe('admin/EventsAdminPage.ErrorId');
    expect(validateEventForm({ ...valid, type: 'outerLink', asset: 'majdata.net' }).asset).toBe('admin/EventsAdminPage.ErrorUrl');
    expect(validateEventForm({ ...valid, type: 'outerLink', asset: 'https://majdata.net' })).toEqual({});
    expect(validateEventForm({ ...valid, type: 'season', asset: 'MMFC15' }).asset).toBe('admin/EventsAdminPage.ErrorCollection');
    expect(validateEventForm({ ...valid, type: 'season', asset: '0123456789abcdef01234567' })).toEqual({});
    expect(validateEventForm({ ...valid, end: valid.start }).end).toBe('admin/EventsAdminPage.ErrorEndBeforeStart');
    expect(validateEventForm({ ...valid, start: '2026-13-01T00:00:00' }).start).toBe('admin/EventsAdminPage.ErrorDate');
  });
});
