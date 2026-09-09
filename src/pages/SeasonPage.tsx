import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageLayout, EventBanner, LoadingSpinner } from '@/components';
import SongCard from '@/components/song/SongCard';
import SeasonLeaderboard from '@/components/season/SeasonLeaderboard';
import { useI18n } from '@/hooks';
import { useEventClock } from '@/hooks/useEventClock';
import { useSeasonCharts, type SeasonChartsState, type SeasonChartSummary } from '@/hooks/useSeasonCharts';
import { getEventById } from '@/utils/eventsData';
import { getSeasonStatus, validateSeasonEvent } from '@/utils/season';
import { EventCategory, type Event, type SeasonConfig } from '@/types/event';

export default function SeasonPage() {
  const { i18n, isReady } = useI18n();
  const [searchParams] = useSearchParams();
  const event = getEventById(searchParams.get('id') ?? '');

  if (!isReady) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="50px" /></div>;

  const notFound = !event || event.category !== EventCategory.Season;
  if (notFound || validateSeasonEvent(event).length > 0) {
    return (
      <PageLayout className="py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">
          {notFound
            ? i18n('season/SeasonPage.NotFound', '没有找到这个季赛')
            : i18n('season/SeasonPage.InvalidConfig', '季赛配置暂不可用')}
        </h1>
        {!notFound && <p className="mb-6 text-white/65">{i18n('season/SeasonPage.ConfigurationHint', '活动信息需要维护者检查，请稍后再来。')}</p>}
        <Link to="/chart-events" className="text-blue-400 underline underline-offset-4">
          {i18n('season/SeasonPage.BackToEvents', '返回活动列表')}
        </Link>
      </PageLayout>
    );
  }

  return <SeasonDetails key={event.id} event={event as Event & { season: SeasonConfig }} />;
}

function SeasonDetails({ event }: { event: Event & { season: SeasonConfig } }) {
  const { i18n, language } = useI18n();
  const now = useEventClock([event]);
  const status = getSeasonStatus(event, now);
  const chartState = useSeasonCharts(event.season.charts);
  const locale = { zh: 'zh-CN', en: 'en-GB', ja: 'ja-JP', ko: 'ko-KR' }[language];
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', dateStyle: 'medium',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', timeStyle: 'medium', hourCycle: 'h23',
  });
  const statusText = status === 'upcoming'
    ? i18n('chart-events/eventsData.EventStatusUpcoming', '即将开始')
    : status === 'ongoing'
      ? i18n('chart-events/eventsData.EventStatusOngoing', '进行中')
      : i18n('chart-events/eventsData.EventStatusEnded', '已结束');
  // Keep the same badge colors and treatment as the events list.
  const statusClass = status === 'upcoming'
    ? 'text-amber-400 bg-amber-400/20 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
    : status === 'ongoing'
      ? 'text-emerald-400 bg-emerald-400/20 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
      : 'text-gray-400 bg-gray-400/20 border border-gray-400/40';

  return (
    <PageLayout className="py-4 sm:py-6 md:py-8 min-h-screen">
      <Helmet><title>{event.title} · Majdata Net</title></Helmet>
      <EventBanner event={event} containerClassName="mx-auto my-4 md:my-6 lg:my-8 px-2 sm:px-4 max-w-5xl" />

      <div className="mx-auto mt-4 mb-8 px-2 sm:mt-6 sm:px-4 max-w-5xl">
        <div className="p-4 sm:p-6" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}>
          <h3 className="mb-3 font-semibold text-white text-base">{i18n('season/SeasonPage.RulesTitle', '如何计分')}</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/80">
            <li>{i18n('season/SeasonPage.RulesBest', '本季曲池中每个文件的各难度分别取活动期间的最佳达成率，再将它们相加。可以多次挑战，以达成更高的总分打榜。')}</li>
            <li>{i18n('season/SeasonPage.RulesTime', '以服务器收到成绩的时间为准，包含起止时刻。未游玩的谱面不贡献分数。')}</li>
          </ul>
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span aria-live="polite" className={`inline-block rounded-md px-2 py-0.5 text-xs sm:text-sm font-semibold ${statusClass}`}>
                • {statusText}
              </span>
              <span className="text-xs text-white/50">{i18n('season/SeasonPage.TimeZone', '北京时间（UTC+8）')}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="min-w-0">
                <dt className="mb-1 text-xs text-white/50">{i18n('season/SeasonPage.Starts', '开始时间')}</dt>
                <dd className="m-0">
                  <time dateTime={event.createDate} className="flex flex-wrap items-baseline gap-x-2 text-sm leading-relaxed tabular-nums">
                    <span className="font-medium text-white/85">{dateFormatter.format(new Date(event.createDate))}</span>
                    <span className="text-white/60">{timeFormatter.format(new Date(event.createDate))}</span>
                  </time>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="mb-1 text-xs text-white/50">{i18n('season/SeasonPage.Ends', '结束时间')}</dt>
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

      <SeasonPool chartState={chartState} />
      <section id="season-leaderboard" className="mx-auto max-w-5xl px-2 sm:px-4 scroll-mt-24">
        <SeasonLeaderboard event={event} status={status} chartState={chartState} />
      </section>
    </PageLayout>
  );
}

function PoolChart({ item, index, retry }: { item: SeasonChartSummary; index: number; retry: SeasonChartsState['retry'] }) {
  const { i18n } = useI18n();
  const { song, error } = item;

  return (
    <li className="min-w-0" data-season-chart={item.id}>
      {song ? <SongCard song={song} index={index} /> : (
        <div className="flex flex-col justify-center items-center gap-3 min-h-40 text-white/70 text-sm text-center" role="status">
          <p>{error
            ? i18n('season/SeasonPool.LoadFailed', '暂时无法加载此谱面')
            : i18n('season/SeasonPool.Loading', '正在加载谱面…')}</p>
          {error && <button type="button" className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer" onClick={() => void retry(item.id)}>
            {i18n('season/SeasonPool.Retry', '重试')}
          </button>}
        </div>
      )}
      {song && item.invalidDifficulty && (
        <p className="mx-auto mt-2 max-w-80 text-red-300 text-sm text-center" role="alert">
          {i18n('season/SeasonPool.InvalidDifficulty', '此文件没有有效难度，请联系活动维护者核查。')}
        </p>
      )}
    </li>
  );
}

function SeasonPool({ chartState }: { chartState: SeasonChartsState }) {
  const { i18n } = useI18n();
  return (
    <section aria-labelledby="season-pool-title" className="mx-auto mt-4 sm:mt-6 md:mt-8 px-2 sm:px-3 md:px-4 max-w-300">
      <div className="mb-8">
        <h2 id="season-pool-title" className="m-0 mb-3 sm:mb-4 md:mb-6 font-bold text-white text-xl sm:text-2xl md:text-3xl text-center" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
          {i18n('season/SeasonPool.Title', '本季曲池')}
        </h2>
      </div>
      <ol className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
        {chartState.items.map((item, index) => <PoolChart key={item.id} item={item} index={index} retry={chartState.retry} />)}
      </ol>
    </section>
  );
}
