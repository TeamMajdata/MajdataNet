import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { endpoints } from '@/config/api';
import { EVENT_CATEGORY_I18N_KEYS, type Event, type EventCategory, type EventType } from '@/types/event';
import { ApiError, apiRequest } from '@/utils/apiClient';
import {
  EVENT_FORM_ERRORS, EVENT_TYPES, emptyEventForm, toEventForm, toEventRequest, validateEventForm,
  type EventFormErrors, type EventFormField, type EventFormValues,
} from '@/utils/eventForm';
import EventBanner from './EventBanner';

interface EventEditorModalProps {
  /** 要编辑的活动；不传则新建。 */
  event?: Event;
  /** 已有活动的 ID，新建时用来提前发现重复。 */
  existingIds: ReadonlySet<string>;
  onClose: () => void;
  onSaved: (event: Event, created: boolean) => void;
}

const typeLabelKeys = {
  outerLink: 'admin/EventsAdminPage.TypeOuterLink',
  eventTag: 'admin/EventsAdminPage.TypeEventTag',
  space: 'admin/EventsAdminPage.TypeSpace',
  season: 'admin/EventsAdminPage.TypeSeason',
} as const satisfies Record<EventType, string>;

const assetHintKeys = {
  outerLink: 'admin/EventsAdminPage.AssetHintOuterLink',
  eventTag: 'admin/EventsAdminPage.AssetHintEventTag',
  space: 'admin/EventsAdminPage.AssetHintSpace',
  season: 'admin/EventsAdminPage.AssetHintSeason',
} as const satisfies Record<EventType, string>;

const inputClass = 'w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-[#e5e5e5] text-sm outline-none focus:border-white/40 disabled:opacity-60';

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="font-medium text-[#e5e5e5] text-sm">{label}</span>
      {children}
      {error
        ? <span role="alert" className="text-[#fca5a5] text-xs">{error}</span>
        : hint && <span className="text-[#a0a0a0] text-xs">{hint}</span>}
    </label>
  );
}

/** 新建或编辑一个活动，左侧表单、右侧横幅预览；保存时直接调用 api/event。 */
export default function EventEditorModal({ event, existingIds, onClose, onSaved }: EventEditorModalProps) {
  const { t } = useTranslation();
  const creating = event === undefined;
  const [values, setValues] = useState<EventFormValues>(() => (event ? toEventForm(event) : emptyEventForm()));
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<EventFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, saving]);

  const errors = useMemo<EventFormErrors>(() => {
    const result = validateEventForm(values);
    if (creating && !result.id && existingIds.has(values.id.trim())) result.id = EVENT_FORM_ERRORS.idTaken;
    return { ...result, ...serverErrors };
  }, [values, creating, existingIds, serverErrors]);
  const shownError = (field: EventFormField) => (submitted && errors[field] ? t(errors[field]) : undefined);

  const preview = useMemo<Event>(() => {
    const request = toEventRequest(values);
    // 时间还没填好时用当前时间，预览里的“多久以前”才不会显示成无效日期。
    const now = new Date().toISOString();
    return {
      ...request,
      createDate: errors.start ? now : request.createDate,
      endDate: errors.end ? now : request.endDate,
    };
  }, [values, errors.start, errors.end]);

  const update = <K extends EventFormField>(field: K, value: EventFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (serverErrors[field]) {
      setServerErrors((current) => {
        const rest = { ...current };
        delete rest[field];
        return rest;
      });
    }
  };

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || saving) return;
    setSaving(true);
    const body = toEventRequest(values);
    try {
      const saved = await apiRequest<Event>(creating ? endpoints.event.list : endpoints.event.item(body.id), {
        method: creating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      onSaved(saved, creating);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerErrors({ id: EVENT_FORM_ERRORS.idTaken });
      } else if (error instanceof ApiError && error.status === 403) {
        toast.error(t('admin/EventsAdminPage.NoPermissionToSave'));
      } else {
        toast.error(t('admin/EventsAdminPage.SaveFailed', { message: error instanceof Error ? error.message : String(error) }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="z-9999 fixed inset-0 flex justify-center items-start bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="event-editor-title" className="bg-[rgb(24,24,30)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] my-auto p-5 sm:p-8 border border-white/10 rounded-2xl w-full max-w-6xl">
        <h2 id="event-editor-title" className="m-0 mb-6 font-semibold text-[#e5e5e5] text-2xl">
          {creating ? t('admin/EventsAdminPage.CreateTitle') : t('admin/EventsAdminPage.EditTitle')}
        </h2>
        <form
          className="gap-8 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          noValidate
          onSubmit={(e) => { e.preventDefault(); void save(); }}
        >
          <div className="gap-4 grid sm:grid-cols-2">
            <Field label={t('admin/EventsAdminPage.FieldId')} hint={t('admin/EventsAdminPage.FieldIdHint')} error={shownError('id')}>
              <input name="id" className={inputClass} value={values.id} disabled={!creating} autoComplete="off"
                onChange={(e) => update('id', e.target.value)} />
            </Field>
            <Field label={t('admin/EventsAdminPage.FieldCategory')}>
              <select name="category" className={inputClass} value={values.category}
                onChange={(e) => update('category', Number(e.target.value) as EventCategory)}>
                {EVENT_CATEGORY_I18N_KEYS.slice(1).map((key, index) => (
                  <option key={key} value={index + 1} className="bg-[rgb(24,24,30)]">{t(key)}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('admin/EventsAdminPage.FieldTitle')} error={shownError('title')}>
                <input name="title" className={inputClass} value={values.title} onChange={(e) => update('title', e.target.value)} />
              </Field>
            </div>
            <Field label={t('admin/EventsAdminPage.FieldType')}>
              <select name="type" className={inputClass} value={values.type}
                onChange={(e) => update('type', e.target.value as EventType)}>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-[rgb(24,24,30)]">{t(typeLabelKeys[type])}</option>
                ))}
              </select>
            </Field>
            <Field label={t('admin/EventsAdminPage.FieldAsset')} hint={t(assetHintKeys[values.type])} error={shownError('asset')}>
              <input name="asset" className={inputClass} value={values.asset} autoComplete="off"
                onChange={(e) => update('asset', e.target.value)} />
            </Field>
            <Field label={t('admin/EventsAdminPage.FieldSrc')} hint={t('admin/EventsAdminPage.FieldSrcHint')} error={shownError('src')}>
              <input name="src" className={inputClass} value={values.src} autoComplete="off"
                onChange={(e) => update('src', e.target.value)} />
            </Field>
            <Field label={t('admin/EventsAdminPage.FieldAlt')} error={shownError('alt')}>
              <input name="alt" className={inputClass} value={values.alt} onChange={(e) => update('alt', e.target.value)} />
            </Field>
            <Field label={t('admin/EventsAdminPage.FieldStart')} error={shownError('start')}>
              <input name="start" type="datetime-local" step="1" className={`${inputClass} scheme-dark`} value={values.start}
                onChange={(e) => update('start', e.target.value)} />
            </Field>
            <Field label={t('admin/EventsAdminPage.FieldEnd')} error={shownError('end')}>
              <input name="end" type="datetime-local" step="1" className={`${inputClass} scheme-dark`} value={values.end}
                onChange={(e) => update('end', e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('admin/EventsAdminPage.FieldDescription')}>
                <textarea name="description" rows={5} className={`${inputClass} resize-y`} value={values.description}
                  onChange={(e) => update('description', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <span className="font-medium text-[#e5e5e5] text-sm">{t('admin/EventsAdminPage.Preview')}</span>
            <EventBanner event={preview} containerClassName="w-full" />
            <div className="flex justify-end gap-3 mt-auto pt-4">
              <button type="button" disabled={saving} onClick={onClose}
                className="bg-white/5 hover:bg-white/10 disabled:opacity-60 px-5 py-2 border border-white/15 rounded-lg text-[#e5e5e5] text-sm cursor-pointer">
                {t('admin/EventsAdminPage.Cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 px-5 py-2 border-none rounded-lg font-medium text-white text-sm cursor-pointer">
                {saving ? t('admin/EventsAdminPage.Saving') : t('admin/EventsAdminPage.Save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
