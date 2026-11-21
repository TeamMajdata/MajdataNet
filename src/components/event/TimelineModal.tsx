import { Trans, useTranslation } from 'react-i18next';
import { getLocale, useLanguage } from '@/i18n';
import { getEventHref } from '@/utils/eventLink';
/**
 * 时间轴弹窗组件 - 从 legacy/src/app/widgets/TimelineModal.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 */

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { getActiveEvents, getAllEvents, getCategoryTranslation, isEventOngoing, isEventUpcoming } from '@/utils/eventsData';
import { useEventClock } from '@/hooks/useEventClock';
import type {
  Event,
  TimelineModalProps,
  TimelineSegment,
  TimelineEvent,
  TimeScale,
  TimelineData,
} from '@/types';
import { EventCategory } from "@/types/event";
import { Link } from 'react-router-dom';
import { LuCalendarRange, LuX } from 'react-icons/lu';


const TimelineModal: React.FC<TimelineModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const language = useLanguage();
  const now = useEventClock(isOpen ? getAllEvents() : []);
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData>({
    startDate: null,
    endDate: null,
    totalDays: 0,
    events: [],
    timeScale: []
  });

  // 按category排序事件
  const sortEventsByCategory = (events: Event[]): Event[] => {
    const categoryOrder: Record<EventCategory, number> = {
      [EventCategory.All]: 0,
      [EventCategory.Major]: 1,
      [EventCategory.Season]: 2,
      [EventCategory.University]: 3,
      [EventCategory.PrivateContest]: 4,
      [EventCategory.PrivateProject]: 5
    };

    return events.sort((a, b) => {
      const orderA = categoryOrder[a.category] || 999;
      const orderB = categoryOrder[b.category] || 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return new Date(a.createDate).getTime() - new Date(b.createDate).getTime();
    });
  };

  // 智能时间轴压缩算法
  const applyTimelineCompression = (
    events: Event[],
    minStart: Date,
    maxEnd: Date,
    totalDays: number
  ) => {
    const sortedEvents = sortEventsByCategory([...events]);

    if (totalDays <= 120) {
      const eventsWithPosition = sortedEvents.map((event, index) => {
        const eventStart = new Date(event.createDate);
        const eventEnd = new Date(event.endDate);
        const eventDuration = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
        const startOffset = Math.ceil((eventStart.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...event,
          startOffset: (startOffset / totalDays) * 100,
          width: (eventDuration / totalDays) * 100,
          duration: eventDuration,
          isOngoing: isEventOngoing(event),
          isUpcoming: isEventUpcoming(event),
          row: index
        };
      });

      return {
        events: eventsWithPosition,
        segments: [{ start: minStart, end: maxEnd, compressed: false, density: 0, days: totalDays, startPosition: 0, endPosition: 100 }],
        isCompressed: false
      };
    }

    const activitySegments = analyzeActivityDensity(sortedEvents, minStart, maxEnd);
    const segments = createCompressedSegments(activitySegments, minStart, maxEnd);

    const eventsWithPosition = sortedEvents.map((event, index) => {
      const eventStart = new Date(event.createDate);
      const eventEnd = new Date(event.endDate);
      const eventDuration = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));

      const position = calculateCompressedPosition(eventStart, eventEnd, segments);

      return {
        ...event,
        startOffset: position.start,
        width: position.width,
        duration: eventDuration,
        isOngoing: isEventOngoing(event),
        isUpcoming: isEventUpcoming(event),
        row: index
      };
    });

    return {
      events: eventsWithPosition,
      segments,
      isCompressed: true
    };
  };

  // 分析活动密度
  const analyzeActivityDensity = (events: Event[], minStart: Date, maxEnd: Date) => {
    const totalDays = Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24));
    const densityMap = new Array(totalDays).fill(0);

    events.forEach(event => {
      const eventStart = new Date(event.createDate);
      const eventEnd = new Date(event.endDate);
      const startDay = Math.floor((eventStart.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24));
      const endDay = Math.floor((eventEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24));

      for (let day = startDay; day <= endDay; day++) {
        if (day >= 0 && day < totalDays) {
          densityMap[day]++;
        }
      }
    });

    interface ActivitySegment {
      startDay: number;
      endDay: number;
      isHighDensity: boolean;
      density: number;
    }

    const segments: ActivitySegment[] = [];
    let currentSegment: ActivitySegment | null = null;
    const threshold = Math.max(1, events.length * 0.3);

    for (let day = 0; day < totalDays; day++) {
      const isHighDensity = densityMap[day] >= threshold;

      if (!currentSegment || currentSegment.isHighDensity !== isHighDensity) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          startDay: day,
          endDay: day,
          isHighDensity,
          density: densityMap[day]
        };
      } else {
        currentSegment.endDay = day;
        currentSegment.density = Math.max(currentSegment.density, densityMap[day]);
      }
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  };

  // 创建压缩段
  const createCompressedSegments = (activitySegments: { startDay: number; endDay: number; isHighDensity: boolean; density: number; }[], minStart: Date, maxEnd: Date): TimelineSegment[] => {
    const segments: TimelineSegment[] = [];
    let currentPosition = 0;

    activitySegments.forEach(segment => {
      const segmentStart = new Date(minStart.getTime() + segment.startDay * 24 * 60 * 60 * 1000);
      const segmentEnd = new Date(minStart.getTime() + (segment.endDay + 1) * 24 * 60 * 60 * 1000);
      const segmentDays = segment.endDay - segment.startDay + 1;

      let segmentWidth: number;
      if (segment.isHighDensity) {
        segmentWidth = Math.max(15, (segmentDays / Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24))) * 70);
      } else {
        const naturalWidth = (segmentDays / Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24))) * 100;
        segmentWidth = Math.min(15, Math.max(5, naturalWidth * 0.3));
      }

      segments.push({
        start: segmentStart,
        end: segmentEnd,
        startPosition: currentPosition,
        endPosition: currentPosition + segmentWidth,
        compressed: !segment.isHighDensity,
        density: segment.density,
        days: segmentDays
      });

      currentPosition += segmentWidth;
    });

    const totalWidth = currentPosition;
    segments.forEach(segment => {
      segment.startPosition = (segment.startPosition / totalWidth) * 100;
      segment.endPosition = (segment.endPosition / totalWidth) * 100;
    });

    return segments;
  };

  // 计算压缩后的位置
  const calculateCompressedPosition = (eventStart: Date, eventEnd: Date, segments: TimelineSegment[]) => {
    let startPosition = 0;
    let endPosition = 0;

    for (const segment of segments) {
      if (eventStart >= segment.start && eventStart <= segment.end) {
        const segmentProgress = (eventStart.getTime() - segment.start.getTime()) / (segment.end.getTime() - segment.start.getTime());
        startPosition = segment.startPosition + (segment.endPosition - segment.startPosition) * segmentProgress;
      }

      if (eventEnd >= segment.start && eventEnd <= segment.end) {
        const segmentProgress = (eventEnd.getTime() - segment.start.getTime()) / (segment.end.getTime() - segment.start.getTime());
        endPosition = segment.startPosition + (segment.endPosition - segment.startPosition) * segmentProgress;
        break;
      }
    }

    if (endPosition === 0) {
      endPosition = segments[segments.length - 1].endPosition;
    }

    return {
      start: Math.max(0, startPosition),
      width: Math.max(1, endPosition - startPosition)
    };
  };

  // 生成压缩后的时间刻度
  const generateCompressedTimeScale = (segments: TimelineSegment[]): TimeScale[] => {
    const scale: TimeScale[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    segments.forEach(segment => {
      const segmentDays = Math.ceil((segment.end.getTime() - segment.start.getTime()) / (1000 * 60 * 60 * 24));
      const stepDays = segment.compressed ? Math.max(7, Math.floor(segmentDays / 3)) :
        segmentDays > 30 ? 3 : 1;

      // 收集该segment内的所有刻度点
      const segmentTicks = new Map<number, TimeScale>();

      // 首先检查今天是否在这个segment内
      if (today >= segment.start && today <= segment.end) {
        const segmentProgress = (today.getTime() - segment.start.getTime()) / (segment.end.getTime() - segment.start.getTime());
        const position = segment.startPosition + (segment.endPosition - segment.startPosition) * segmentProgress;

        segmentTicks.set(today.getTime(), {
          date: new Date(today),
          position,
          isMonth: true, // 使用 isMonth 标记今天，以显示较粗的线
          isWeek: false,
          compressed: segment.compressed
        });
      }

      // 然后添加常规刻度点
      const current = new Date(segment.start);
      while (current <= segment.end) {
        const timeKey = current.getTime();

        // 如果这个点还没被添加（不是今天）
        if (!segmentTicks.has(timeKey)) {
          const segmentProgress = (current.getTime() - segment.start.getTime()) / (segment.end.getTime() - segment.start.getTime());
          const position = segment.startPosition + (segment.endPosition - segment.startPosition) * segmentProgress;

          segmentTicks.set(timeKey, {
            date: new Date(current),
            position,
            isMonth: false,
            isWeek: current.getDay() === 1 && stepDays >= 7,
            compressed: segment.compressed
          });
        }

        current.setDate(current.getDate() + stepDays);
      }

      // 按时间排序并添加到scale中
      const sortedTicks = Array.from(segmentTicks.entries())
        .sort((a, b) => a[0] - b[0])
        .map(entry => entry[1]);

      scale.push(...sortedTicks);
    });

    return scale;
  };

  useEffect(() => {
    if (!isOpen) return;

    const events = getActiveEvents();
    if (events.length === 0) {
      setOngoingEvents([]);
      setTimelineData({
        startDate: null,
        endDate: null,
        totalDays: 0,
        events: [],
        timeScale: []
      });
      return;
    }

    setOngoingEvents(events);

    const dates = events.map(event => ({
      start: new Date(event.createDate),
      end: new Date(event.endDate),
      duration: Math.ceil((new Date(event.endDate).getTime() - new Date(event.createDate).getTime()) / (1000 * 60 * 60 * 24))
    }));

    const minStart = new Date(Math.min(...dates.map(d => d.start.getTime())));
    const maxEnd = new Date(Math.max(...dates.map(d => d.end.getTime())));
    const totalDays = Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24));

    const compressedTimelineData = applyTimelineCompression(events, minStart, maxEnd, totalDays);
    const timeScale = generateCompressedTimeScale(compressedTimelineData.segments);

    setTimelineData({
      startDate: minStart,
      endDate: maxEnd,
      totalDays,
      events: compressedTimelineData.events,
      timeScale,
      segments: compressedTimelineData.segments,
      isCompressed: compressedTimelineData.isCompressed
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, now, language]);

  // 格式化日期显示
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(getLocale(language), {
      month: "short",
      day: "numeric"
    });
  };

  // 格式化紧凑日期显示
  const formatCompactDate = (date: Date): string => {
    return date.toLocaleDateString(getLocale(language), {
      month: "numeric",
      day: "numeric"
    });
  };

  // 获取事件颜色
  const getEventColor = (event: TimelineEvent): string => {
    const baseColors: Record<EventCategory, string> = {
      [EventCategory.All]: "#6b7280",
      [EventCategory.Major]: "#3b82f6",
      [EventCategory.PrivateContest]: "#10b981",
      [EventCategory.University]: "#f59e0b",
      [EventCategory.PrivateProject]: "#8b5cf6",
      [EventCategory.Season]: "#06b6d4",
    };

    const baseColor = baseColors[event.category] || "#6b7280";

    if (event.isUpcoming) {
      const upcomingColors: Record<string, string> = {
        "#3b82f6": "#93c5fd",
        "#10b981": "#6ee7b7",
        "#f59e0b": "#fbbf24",
        "#8b5cf6": "#c4b5fd",
        "#06b6d4": "#67e8f9",
        "#6b7280": "#9ca3af"
      };
      return upcomingColors[baseColor] || "#9ca3af";
    }

    return baseColor;
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      zIndexClass="z-1100"
      labelledBy="timeline-title"
      className="flex flex-col max-w-225 max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-4 px-5 sm:px-6 py-4 border-white/[0.07] border-b">
        <div className="min-w-0">
          <h2 id="timeline-title" className="flex items-center gap-2 m-0 font-semibold text-white! text-lg! text-left!">
            <LuCalendarRange aria-hidden="true" className="w-5 h-5 text-blue-300" />
            {t("chart-events/TimelineModal.EventTimeline")}
          </h2>
          {ongoingEvents.length > 0 && timelineData.startDate && timelineData.endDate && (
            <p className="m-0 mt-1 text-white/50! text-sm tabular-nums">
              {formatDate(timelineData.startDate)} — {formatDate(timelineData.endDate)}
            </p>
          )}
        </div>
        <button
          type="button"
          className="place-items-center grid hover:bg-white/10 -mr-1.5 rounded-lg w-9 h-9 text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
          onClick={onClose}
          aria-label={t("auth/AuthModal.Close")}
        >
          <LuX aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto overscroll-contain">
        {ongoingEvents.length === 0 ? (
          <div className="px-4 py-12 text-white/70 text-lg text-center">
            <p>{t("chart-events/TimelineModal.NoActiveEvents")}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="flex items-center gap-1.5 bg-emerald-400/10 px-2.5 rounded-lg h-7 text-emerald-200 text-xs">
                <Trans i18nKey="chart-events/TimelineModal.ActiveEvents" count={ongoingEvents.length} components={{ strong: <strong className="font-semibold text-emerald-100" /> }} />
              </span>
              <span className="flex items-center gap-1.5 bg-white/[0.05] px-2.5 rounded-lg h-7 text-white/70 text-xs">
                <Trans i18nKey="chart-events/TimelineModal.TimeSpan" count={timelineData.totalDays} components={{ strong: <strong className="font-semibold text-white" /> }} />
              </span>
            </div>

            <div>
              <div className="relative overflow-hidden">
                {/* Grid Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {timelineData.timeScale.map((tick, index) => (
                    <div
                      key={index}
                      className={`absolute top-0 bottom-0 ${tick.isMonth ? 'w-px bg-white/15' :
                        tick.isWeek ? 'w-px bg-white/8' :
                          'w-px bg-white/3'
                        }`}
                      style={{ left: `${tick.position}%` }}
                    />
                  ))}
                </div>

                {/* Events */}
                <div className="flex flex-col gap-1 py-1 text-left">
                  {timelineData.events.map((event) => (
                    <div key={event.id} className="flex sm:flex-row flex-col items-stretch sm:items-center gap-2 sm:gap-4 hover:bg-white/[0.03] px-2 py-2.5 sm:py-2 rounded-lg transition-colors">
                      <div className="flex-auto sm:flex-[0_0_180px] min-w-0 text-left">
                        <div className="mb-0.5 overflow-hidden font-medium text-[0.85rem] text-white text-ellipsis leading-tight whitespace-nowrap">
                          {event.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.7rem]">
                          <span
                            className="font-medium"
                            style={{ color: getEventColor(event) }}
                          >
                            {getCategoryTranslation(event.category)}
                          </span>
                          <span className="text-white/45 tabular-nums">
                            {formatCompactDate(new Date(event.createDate))} - {formatCompactDate(new Date(event.endDate))}
                          </span>
                        </div>
                      </div>
                      <div className="relative flex-none sm:flex-1 bg-white/[0.04] rounded-md w-full h-6">
                        <Link
                          to={getEventHref(event)}
                          className="block top-0 hover:z-10 absolute hover:brightness-125 rounded-md min-w-1.5 h-full overflow-hidden no-underline transition-[filter] cursor-pointer"
                          style={{
                            left: `${event.startOffset}%`,
                            width: `${event.width}%`,
                            backgroundColor: getEventColor(event),
                          }}
                          title={`${event.title}\n${formatCompactDate(new Date(event.createDate))} - ${formatCompactDate(new Date(event.endDate))}\n${t("chart-events/TimelineModal.Duration", { count: event.duration })}\n${t("chart-events/TimelineModal.ClickToViewDetails")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div className="flex items-center px-2 w-full h-full">
                            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] overflow-hidden font-medium text-[0.7rem] text-white text-ellipsis whitespace-nowrap">
                              {event.title}
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default TimelineModal;
