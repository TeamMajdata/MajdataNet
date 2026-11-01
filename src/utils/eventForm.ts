import type { Event, EventCategory, EventType } from '@/types/event';

/** 活动编辑表单的值；时间是北京时间的 datetime-local 字符串（YYYY-MM-DDTHH:mm:ss）。 */
export interface EventFormValues {
  id: string;
  type: EventType;
  asset: string;
  src: string;
  alt: string;
  title: string;
  category: EventCategory;
  start: string;
  end: string;
  description: string;
}

export type EventFormField = keyof EventFormValues;

export const EVENT_TYPES: readonly EventType[] = ['outerLink', 'eventTag', 'space', 'season'];

// 活动时间统一按北京时间编辑，和 events.json 导入脚本一致，不随浏览器时区变化。
const beijingOffsetMs = 8 * 60 * 60 * 1000;
const beijingOffset = '+08:00';

/** 把带时区的时间转成北京时间的 datetime-local 值，精确到秒。 */
export function toBeijingInput(value: string): string {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time + beijingOffsetMs).toISOString().slice(0, 19) : '';
}

/** 把北京时间的 datetime-local 值转成后端要求的带秒和时区的时间。 */
export function fromBeijingInput(value: string): string {
  return `${value.length === 16 ? `${value}:00` : value}${beijingOffset}`;
}

export function emptyEventForm(): EventFormValues {
  return {
    id: '', type: 'outerLink', asset: '', src: '/events/', alt: '', title: '',
    category: 2, start: '', end: '', description: '',
  };
}

export function toEventForm(event: Event): EventFormValues {
  return {
    id: event.id,
    type: event.type,
    asset: event.asset,
    src: event.src,
    alt: event.alt,
    title: event.title,
    category: event.category,
    start: toBeijingInput(event.createDate),
    end: toBeijingInput(event.endDate),
    description: event.description,
  };
}

/** 生成 POST / PUT api/event 的请求体；文本两端的空白不保存。 */
export function toEventRequest(values: EventFormValues): Event {
  return {
    id: values.id.trim(),
    type: values.type,
    asset: values.asset.trim(),
    src: values.src.trim(),
    alt: values.alt.trim(),
    title: values.title.trim(),
    category: values.category,
    createDate: fromBeijingInput(values.start),
    endDate: fromBeijingInput(values.end),
    description: values.description.trim(),
  };
}

export const EVENT_FORM_ERRORS = {
  required: 'admin/EventsAdminPage.ErrorRequired',
  id: 'admin/EventsAdminPage.ErrorId',
  url: 'admin/EventsAdminPage.ErrorUrl',
  collection: 'admin/EventsAdminPage.ErrorCollection',
  date: 'admin/EventsAdminPage.ErrorDate',
  endBeforeStart: 'admin/EventsAdminPage.ErrorEndBeforeStart',
  // 只有和已有活动比较时才知道，validateEventForm 不产生它。
  idTaken: 'admin/EventsAdminPage.ErrorIdTaken',
} as const;

export type EventFormErrorKey = typeof EVENT_FORM_ERRORS[keyof typeof EVENT_FORM_ERRORS];
export type EventFormErrors = Partial<Record<EventFormField, EventFormErrorKey>>;

// datetime-local 的值可能省略为零的秒，也可能带毫秒（后端接受最多 3 位）。
const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 与后端 NetEventValidator 相同的规则，提交前给出逐字段的提示；后端仍会再校验一次。 */
export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};
  const id = values.id.trim();
  if (!id) errors.id = EVENT_FORM_ERRORS.required;
  else if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) errors.id = EVENT_FORM_ERRORS.id;

  for (const field of ['asset', 'src', 'alt', 'title'] as const) {
    if (!values[field].trim()) errors[field] = EVENT_FORM_ERRORS.required;
  }
  const asset = values.asset.trim();
  if (asset && values.type === 'outerLink' && !isHttpUrl(asset)) errors.asset = EVENT_FORM_ERRORS.url;
  if (asset && values.type === 'season' && !/^[\da-f]{24}$/i.test(asset)) errors.asset = EVENT_FORM_ERRORS.collection;

  for (const field of ['start', 'end'] as const) {
    if (!values[field]) errors[field] = EVENT_FORM_ERRORS.required;
    else if (!datePattern.test(values[field]) || !Number.isFinite(Date.parse(fromBeijingInput(values[field])))) {
      errors[field] = EVENT_FORM_ERRORS.date;
    }
  }
  if (!errors.start && !errors.end
    && Date.parse(fromBeijingInput(values.start)) >= Date.parse(fromBeijingInput(values.end))) {
    errors.end = EVENT_FORM_ERRORS.endBeforeStart;
  }
  return errors;
}
