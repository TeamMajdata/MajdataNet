import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageLayout, EventBanner } from '@/components';
import SongCard from '@/components/song/SongCard';
import SeasonLeaderboard from '@/components/season/SeasonLeaderboard';
import CollectionSubscribeButton from '@/components/collection/CollectionSubscribeButton';
import { useEventClock } from '@/hooks/useEventClock';
import { useSeasonCharts, type SeasonChartsState, type SeasonChartSummary } from '@/hooks/useSeasonCharts';
import { getEventById } from '@/utils/eventsData';
import { getSeasonStatus, validateSeasonEvent } from '@/utils/season';
import { type Event } from '@/types/event';
import { CARD_SURFACE_CLASS, SECTION_HEADING_CLASS } from '@/components/ui/surface';
import { SONG_GRID_CLASS } from '@/components/song/songGrid';

export default function SeasonPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const event = getEventById(searchParams.get('id') ?? '');

  const notFound = !event || event.type !== 'season';
  if (notFound || validateSeasonEvent(event).length > 0) {
    return (
      <PageLayout className="py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">
          {notFound
            ? t('season/SeasonPage.NotFound')
            : t('season/SeasonPage.InvalidConfig')}
        </h1>
        {!notFound && <p className="mb-6 text-white/65">{t('season/SeasonPage.ConfigurationHint')}</p>}
        <Link to="/chart-events" className="text-blue-400 underline underline-offset-4">
          {t('season/SeasonPage.BackToEvents')}
        </Link>
      </PageLayout>
    );
  }

  return <SeasonDetails key={event.id} event={event} />;
}

function SeasonDetails({ event }: { event: Event }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const now = useEventClock([event]);
  const status = getSeasonStatus(event, now);
  const chartState = useSeasonCharts(event.asset);
  const locale = { zh: 'zh-CN', en: 'en-GB', ja: 'ja-JP', ko: 'ko-KR' }[language];
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', dateStyle: 'medium',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', timeStyle: 'medium', hourCycle: 'h23',
  });
  const statusText = status === 'upcoming'
    ? t('chart-events/eventsData.EventStatusUpcoming')
    : status === 'ongoing'
      ? t('chart-events/eventsData.EventStatusOngoing')
      : t('chart-events/eventsData.EventStatusEnded');
  // Keep the same badge colors and treatment as the events list.
  const statusClass = status === 'upcoming'
    ? 'text-amber-400 bg-amber-400/20 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
    : status === 'ongoing'
      ? 'text-emerald-400 bg-emerald-400/20 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
      : 'text-gray-400 bg-gray-400/20 border border-gray-400/40';

  return (
    <PageLayout>
      <Helmet><title>{event.title} · Majdata.Net</title></Helmet>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
      <EventBanner event={event} containerClassName="mb-6" />

      {/* 规则和赛期：和其他页面一样的卡片底色 */}
      <div className="mb-10">
        <div className={`${CARD_SURFACE_CLASS} p-5 sm:p-6`}>
          <h2 className="m-0 mb-3 font-semibold text-white! text-base! text-left!">{t('season/SeasonPage.RulesTitle')}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/80">
            <li>{t('season/SeasonPage.RulesBest')}</li>
            <li>{t('season/SeasonPage.RulesTime')}</li>
          </ul>
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span aria-live="polite" className={`inline-block rounded-md px-2 py-0.5 text-xs sm:text-sm font-semibold ${statusClass}`}>
                • {statusText}
              </span>
              <span className="text-xs text-white/50">{t('season/SeasonPage.TimeZone')}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="min-w-0">
                <dt className="mb-1 text-xs text-white/50">{t('season/SeasonPage.Starts')}</dt>
                <dd className="m-0">
                  <time dateTime={event.createDate} className="flex flex-wrap items-baseline gap-x-2 text-sm leading-relaxed tabular-nums">
                    <span className="font-medium text-white/85">{dateFormatter.format(new Date(event.createDate))}</span>
                    <span className="text-white/60">{timeFormatter.format(new Date(event.createDate))}</span>
                  </time>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="mb-1 text-xs text-white/50">{t('season/SeasonPage.Ends')}</dt>
                <dd className="m-0">
                  <time dateTime={event.endDate} className="flex flex-wrap items-baseline gap-x-2 text-sm leading-relaxed tabular-nums">
                    <span className="font-medium text-white/85">{dateFormatter.format(new Date(event.endDate))}</span>
                    <span className="text-white/60">{timeFormatter.format(new Date(event.endDate))}</span>
                  </time>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <SeasonPool chartState={chartState} collectionId={event.asset} />
      <section id="season-leaderboard" className="mt-10 scroll-mt-24">
        <SeasonLeaderboard event={event} status={status} chartState={chartState} />
      </section>
      </div>
    </PageLayout>
  );
}

function PoolChart({ item, index, retry }: { item: SeasonChartSummary; index: number; retry: SeasonChartsState['retry'] }) {
  const { t } = useTranslation();
  const { song, error } = item;

  return (
    <li className="min-w-0" data-season-chart={item.id}>
      {song ? <SongCard song={song} index={index} /> : (
        <div className="flex flex-col justify-center items-center gap-3 min-h-40 text-white/70 text-sm text-center" role="status">
          <p>{error
            ? t('season/SeasonPool.LoadFailed')
            : t('season/SeasonPool.Loading')}</p>
          {error && <button type="button" className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer" onClick={() => void retry(item.id)}>
            {t('season/SeasonPool.Retry')}
          </button>}
        </div>
      )}
      {song && item.invalidDifficulty && (
        <p className="mx-auto mt-2 max-w-80 text-red-300 text-sm text-center" role="alert">
          {t('season/SeasonPool.InvalidDifficulty')}
        </p>
      )}
    </li>
  );
}

function SeasonPool({ chartState, collectionId }: { chartState: SeasonChartsState; collectionId: string }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="season-pool-title">
      {/* 小标题居左，订阅按钮在右 */}
      <div className="flex justify-between items-center gap-3 mb-3">
        <h2 id="season-pool-title" className={`${SECTION_HEADING_CLASS} mb-0!`}>
          {t('season/SeasonPool.Title')}
        </h2>
        <CollectionSubscribeButton collectionId={collectionId} />
      </div>
      <ol className={`${SONG_GRID_CLASS} m-0 p-0 list-none`}>
        {chartState.items.map((item, index) => <PoolChart key={item.id} item={item} index={index} retry={chartState.retry} />)}
      </ol>
    </section>
  );
}
