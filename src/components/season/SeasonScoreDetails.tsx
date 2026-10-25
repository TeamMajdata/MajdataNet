import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { IoStatsChartOutline } from 'react-icons/io5';
import { useI18n } from '@/hooks/useI18n';
import { useSeasonBreakdown } from '@/hooks/useSeasonBreakdown';
import { endpoints } from '@/config/api';
import { stripTmpTags } from '@/utils/richTextUtils';
import { renderLevel } from '@/utils/renderLevel';
import type { Event } from '@/types/event';
import type { RankedSeasonEntry } from '@/types/event';
import type { SeasonChartsState } from '@/hooks/useSeasonCharts';
import '@/styles/components/season-score-details.css';

interface SeasonScoreDetailsProps {
  event: Event;
  chartState: SeasonChartsState;
  player: RankedSeasonEntry;
  status: 'upcoming' | 'ongoing' | 'ended';
  children: ReactNode;
}

const levelNames = ['Easy', 'Basic', 'Advanced', 'Expert', 'Master', 'Re:Master', 'UTAGE'];
const levelColors = ['#6fabfa', '#5dd45d', '#caca54', '#ff5b5b', '#dca5ef', '#e6a4e6', '#ff9100'];

export default function SeasonScoreDetails({ event, chartState, player, status, children }: SeasonScoreDetailsProps) {
  const { i18n } = useI18n();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'top' | 'right' | 'left'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const { items, isLoading, hasErrors } = useSeasonBreakdown(event, chartState, player.playerId, open, status);
  const label = i18n('season/SeasonScoreDetails.Title', '曲目成绩');
  const positionDetails = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = document.documentElement.clientWidth;
    const width = Math.min(380, viewport - 24);
    setSide(viewport - rect.right >= width + 24 ? 'right' : rect.left >= width + 24 ? 'left' : 'top');
  }, []);
  function changeOpen(next: boolean) {
    if (next) positionDetails();
    setOpen(next);
  }
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', positionDetails);
    return () => window.removeEventListener('resize', positionDetails);
  }, [open, positionDetails]);

  return (
    <Tooltip.Root open={open} onOpenChange={changeOpen} delayDuration={220}>
      <Tooltip.Trigger asChild>
        <div ref={triggerRef} className="season-score-details-trigger">
          {children}
          <button type="button" className="season-score-details-button" aria-label={`${player.username} · ${label}`}
            aria-expanded={open} aria-controls={open ? contentId : undefined}
            onClick={e => { e.preventDefault(); e.stopPropagation(); changeOpen(true); }}>
            <IoStatsChartOutline aria-hidden="true" />
          </button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content id={contentId} side={side} align="center" sideOffset={12} collisionPadding={12}
          className="season-score-details" onPointerDownOutside={() => setOpen(false)}>
          <div className="season-score-details__heading">
            <div>
              <p className="season-score-details__eyebrow">{label}</p>
              <p className="season-score-details__username">{player.username}</p>
            </div>
            <IoStatsChartOutline aria-hidden="true" />
          </div>
          <ul className="season-score-details__list" aria-busy={isLoading}>
            {items.map(item => (
              <li key={item.id} className="season-score-details__row">
                <img src={endpoints.maichart.image(item.id)} alt="" loading="lazy"
                  onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                <div className="season-score-details__song">
                  <p className="season-score-details__title" title={stripTmpTags(item.song?.title ?? item.id)}>{stripTmpTags(item.song?.title ?? item.id)}</p>
                  <div className="season-score-details__levels">
                    {item.song?.levels.map((level, index) => level.trim() && (
                      <span key={index} style={{ color: levelColors[index] }} title={`${levelNames[index]} ${level}`}>
                        {levelNames[index]} {renderLevel(level)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`season-score-details__score${item.score === undefined || item.error ? ' season-score-details__score--muted' : ''}`}>
                  {item.error ? i18n('season/SeasonScoreDetails.Unavailable', '暂不可用')
                    : item.isLoading ? <span aria-label={i18n('season/SeasonScoreDetails.Loading', '加载中…')}>…</span>
                      : item.score === undefined ? i18n('season/SeasonScoreDetails.NoScore', '无成绩')
                        : <>{item.score.toFixed(4)}<span>%</span></>}
                </div>
              </li>
            ))}
          </ul>
          {hasErrors && <p role="status" className="season-score-details__error">{i18n('season/SeasonScoreDetails.LoadFailed', '部分成绩加载失败，请稍后再试。')}</p>}
          <p className="season-score-details__note">{i18n('season/SeasonScoreDetails.Rule', '每曲分数为文件内各难度的赛期最佳达成率之和。')}</p>
          <Tooltip.Arrow className="fill-[#262b33]" width={12} height={6} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
