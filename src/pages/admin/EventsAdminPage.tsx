import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { LoadingSpinner, PageLayout } from '@/components';
import EventEditorModal from '@/components/event/EventEditorModal';
import { endpoints } from '@/config/api';
import { hasUserGroup, useSessionGroups } from '@/hooks';
import { getLocale } from '@/i18n';
import type { Event } from '@/types/event';
import { apiFetcher, apiRequest } from '@/utils/apiClient';
import { getEventHref } from '@/utils/eventLink';
import { getCategoryTranslation } from '@/utils/eventsData';
import { getSeasonStatus } from '@/utils/season';

type StatusFilter = 'all' | 'ongoing' | 'upcoming' | 'ended';
type Editing = { event?: Event } | null;

const statusLabelKeys = {
  all: 'chart-events/eventsData.FilterAll',
  ongoing: 'chart-events/eventsData.EventStatusOngoing',
  upcoming: 'chart-events/eventsData.EventStatusUpcoming',
  ended: 'chart-events/eventsData.EventStatusEnded',
} as const satisfies Record<StatusFilter, string>;

const statusBadgeClasses = {
  ongoing: 'bg-[rgba(34,197,94,0.15)] text-[#86efac] border-[rgba(34,197,94,0.4)]',
  upcoming: 'bg-[rgba(59,130,246,0.15)] text-[#93c5fd] border-[rgba(59,130,246,0.4)]',
  ended: 'bg-white/5 text-[#a0a0a0] border-white/15',
} as const;

const panelClass = 'bg-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md p-4 sm:p-6 border border-white/10 rounded-2xl';
const smallButtonClass = 'bg-white/5 hover:bg-white/10 px-3 py-1.5 border border-white/15 rounded-lg text-[#e5e5e5] text-sm no-underline cursor-pointer whitespace-nowrap';

/** 活动管理：eventManager 组（或管理员）列出、新建、编辑、删除 api/event 中的活动。 */
export default function EventsAdminPage() {
  const { t } = useTranslation();
  const { groups, isLoading: isGroupsLoading } = useSessionGroups();
  const canManage = hasUserGroup(groups, 'eventManager');
  // 与 useEvents 共用缓存键，保存后首页和活动页也会拿到新数据。
  const { data: events, error, mutate } = useSWR<Event[]>(canManage ? endpoints.event.list : null, apiFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<Editing>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 页面打开期间固定一个时间点，状态和计数不会在每次渲染时变化。
  const [now] = useState(() => Date.now());
  const existingIds = useMemo(() => new Set((events ?? []).map((event) => event.id)), [events]);
  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: 0, ongoing: 0, upcoming: 0, ended: 0 };
    for (const event of events ?? []) {
      result.all += 1;
      result[getSeasonStatus(event, now)] += 1;
    }
    return result;
  }, [events, now]);
  const visibleEvents = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return (events ?? []).filter((event) => (status === 'all' || getSeasonStatus(event, now) === status)
      && (!query || event.id.toLowerCase().includes(query) || event.title.toLowerCase().includes(query)));
  }, [events, keyword, status, now]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(getLocale(), {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }), []);

  const handleSaved = (saved: Event, created: boolean) => {
    setEditing(null);
    toast.success(created ? t('admin/EventsAdminPage.Created') : t('admin/EventsAdminPage.Saved'));
    // 先按服务端返回的内容更新列表，再重新拉取以得到后端的排序。
    void mutate((current) => [saved, ...(current ?? []).filter((event) => event.id !== saved.id)], { revalidate: true });
  };

  const handleDelete = async (event: Event) => {
    if (!window.confirm(t('admin/EventsAdminPage.ConfirmDelete', { title: event.title }))) return;
    setDeletingId(event.id);
    try {
      await apiRequest(endpoints.event.item(event.id), { method: 'DELETE' });
      toast.success(t('admin/EventsAdminPage.Deleted'));
      void mutate((current) => (current ?? []).filter((item) => item.id !== event.id), { revalidate: true });
    } catch (e) {
      toast.error(t('admin/EventsAdminPage.DeleteFailed', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setDeletingId(null);
    }
  };

  if (isGroupsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  return (
    <PageLayout title={t('admin/EventsAdminPage.Title')} showBackToHome={false}>
      {!canManage ? (
        <p className={`${panelClass} m-0 text-[#e5e5e5] text-center`}>{t('admin/EventsAdminPage.NoPermission')}</p>
      ) : (
        <section className={panelClass}>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex flex-wrap gap-2" role="group">
              {(Object.keys(statusLabelKeys) as StatusFilter[]).map((key) => (
                <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}
                  className={`px-3 py-1.5 border rounded-lg text-sm cursor-pointer ${status === key ? 'bg-white/15 border-white/40 text-white' : 'bg-white/5 border-white/10 text-[#a0a0a0] hover:text-[#e5e5e5]'}`}>
                  {t(statusLabelKeys[key])} {counts[key]}
                </button>
              ))}
            </div>
            <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('admin/EventsAdminPage.Search')} aria-label={t('admin/EventsAdminPage.Search')}
              className="flex-1 bg-white/5 px-3 py-1.5 border border-white/15 focus:border-white/40 rounded-lg outline-none min-w-48 text-[#e5e5e5] text-sm" />
            <button type="button" onClick={() => setEditing({})}
              className="bg-[#3b82f6] hover:bg-[#2563eb] px-4 py-1.5 border-none rounded-lg font-medium text-white text-sm cursor-pointer">
              {t('admin/EventsAdminPage.Create')}
            </button>
          </div>

          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-[#e5e5e5]">
              <p className="m-0">{t('admin/EventsAdminPage.LoadFailed')}</p>
              <button type="button" className={smallButtonClass} onClick={() => void mutate()}>{t('admin/EventsAdminPage.Retry')}</button>
            </div>
          ) : !events ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="40px" /></div>
          ) : visibleEvents.length === 0 ? (
            <p className="m-0 py-10 text-[#a0a0a0] text-center">{t('admin/EventsAdminPage.NoEvents')}</p>
          ) : (
            <ul className="flex flex-col gap-3 m-0 p-0 list-none">
              {visibleEvents.map((event) => {
                const eventStatus = getSeasonStatus(event, now);
                const href = getEventHref(event);
                return (
                  <li key={event.id} className="flex sm:flex-row flex-col sm:items-center gap-4 bg-white/3 p-3 border border-white/10 rounded-xl">
                    <img src={event.src} alt={event.alt} loading="lazy"
                      className="bg-black/30 rounded-lg w-full sm:w-48 object-cover shrink-0" style={{ aspectRatio: '1279 / 372' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 border rounded-md text-xs ${statusBadgeClasses[eventStatus]}`}>{t(statusLabelKeys[eventStatus])}</span>
                        <h3 className="m-0 overflow-hidden font-semibold text-[#e5e5e5] text-base text-ellipsis whitespace-nowrap">{event.title}</h3>
                      </div>
                      <p className="m-0 overflow-hidden text-[#a0a0a0] text-xs text-ellipsis whitespace-nowrap">
                        <code>{event.id}</code> · {getCategoryTranslation(event.category)} · {event.type}: {event.asset}
                      </p>
                      <p className="m-0 mt-1 text-[#a0a0a0] text-xs">
                        {dateFormat.format(new Date(event.createDate))} – {dateFormat.format(new Date(event.endDate))}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a className={smallButtonClass} href={href} target="_blank" rel="noreferrer">{t('admin/EventsAdminPage.View')}</a>
                      <button type="button" className={smallButtonClass} onClick={() => setEditing({ event })}>{t('admin/EventsAdminPage.Edit')}</button>
                      <button type="button" disabled={deletingId === event.id} onClick={() => void handleDelete(event)}
                        className={`${smallButtonClass} hover:bg-[rgba(239,68,68,0.2)] hover:text-[#fca5a5] disabled:opacity-60`}>
                        {t('admin/EventsAdminPage.Delete')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      {editing && (
        <EventEditorModal event={editing.event} existingIds={existingIds} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </PageLayout>
  );
}
