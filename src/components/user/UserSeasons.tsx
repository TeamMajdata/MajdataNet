import { useI18n } from '@/hooks/useI18n';
import { useUserSeasons } from '@/hooks/useUserSeasons';
import { Link } from 'react-router-dom';
import { IoArrowForwardOutline, IoTrophyOutline } from 'react-icons/io5';
import type { Event, RankedSeasonEntry } from '@/types/event';
import '@/styles/components/user-season-achievements.css';

export default function UserSeasons({ username }: { username: string }) {
  const { i18n } = useI18n();
  const { results, isLoading, hasErrors, refresh } = useUserSeasons(username);
  if (!isLoading && !hasErrors && results.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby="user-seasons-title">
      <h2 id="user-seasons-title" className="my-6 sm:my-8 font-semibold text-white text-2xl sm:text-3xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
        {i18n('user/UserSeasons.Title', '季赛战绩')}
      </h2>
      {results.length > 0 && (
        <ul className="user-season-list">
          {results.map(result => <li key={result.event.id}><UserSeasonCard {...result} /></li>)}
        </ul>
      )}
      {isLoading && <p role="status" className="py-5 text-center text-sm text-white/60">{i18n('user/UserSeasons.Loading', '正在加载季赛战绩…')}</p>}
      {hasErrors && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-white/65">
          <p>{i18n('user/UserSeasons.LoadFailed', '部分季赛战绩暂时无法加载。')}</p>
          <button type="button" onClick={() => void refresh()} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-white cursor-pointer hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-blue-400">
            {i18n('user/UserSeasons.Retry', '重试')}
          </button>
        </div>
      )}
    </section>
  );
}

interface UserSeasonCardProps {
  event: Event;
  status: 'ongoing' | 'ended';
  entry: RankedSeasonEntry;
}

function UserSeasonCard({ event, status, entry }: UserSeasonCardProps) {
  const { i18n, language } = useI18n();
  const locale = { zh: 'zh-CN', en: 'en-GB', ja: 'ja-JP', ko: 'ko-KR' }[language];
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const statusText = status === 'ongoing'
    ? i18n('chart-events/eventsData.EventStatusOngoing', '进行中')
    : i18n('chart-events/eventsData.EventStatusEnded', '已结束');

  return (
    <Link to={`/season?id=${encodeURIComponent(event.id)}`} className={`user-season-card${entry.rank === 1 ? ' user-season-card--first' : ''}`}>
      <img className="user-season-card__background" src={event.src} alt="" aria-hidden="true" loading="lazy"
        onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
      <div className="user-season-card__header">
        <span className={`user-season-card__status user-season-card__status--${status}`}>• {statusText}</span>
        <span className="user-season-card__dates" title={i18n('season/SeasonPage.TimeZone', '北京时间（UTC+8）')}>
          <time dateTime={event.createDate}>{formatter.format(new Date(event.createDate))}</time>
          <span aria-hidden="true"> — </span>
          <time dateTime={event.endDate}>{formatter.format(new Date(event.endDate))}</time>
        </span>
      </div>
      <h3 className="user-season-card__title">{event.title}</h3>
      <dl className="user-season-card__scores">
        <div>
          <dt><IoTrophyOutline aria-hidden="true" />{i18n('user/UserSeasons.Rank', '排名')}</dt>
          <dd className="user-season-card__rank"><span>#</span>{entry.rank}</dd>
        </div>
        <div>
          <dt>{i18n('user/UserSeasons.TotalScore', '总分')}</dt>
          <dd className="user-season-card__total">{entry.score.toFixed(4)}<span>%</span></dd>
        </div>
      </dl>
      <span className="user-season-card__link">{i18n('user/UserSeasons.ViewSeason', '查看季赛')}<IoArrowForwardOutline aria-hidden="true" /></span>
    </Link>
  );
}
