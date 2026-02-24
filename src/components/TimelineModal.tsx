/**
 * 时间轴弹窗组件 - 从 legacy/src/app/widgets/TimelineModal.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 */

import { useEffect, useState } from 'react';
import { getActiveEvents, isEventOngoing, isEventUpcoming } from '@/utils/eventsData';
import { useLoc } from '@/hooks';
import type { Event } from '@/types';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TimelineSegment {
  start: Date;
  end: Date;
  startPosition: number;
  endPosition: number;
  compressed: boolean;
  density: number;
  days: number;
}

interface TimelineEvent extends Event {
  startOffset: number;
  width: number;
  duration: number;
  isOngoing: boolean;
  isUpcoming: boolean;
  row: number;
}

interface TimeScale {
  date: Date;
  position: number;
  isMonth: boolean;
  isWeek: boolean;
  compressed: boolean;
}

interface TimelineData {
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  events: TimelineEvent[];
  timeScale: TimeScale[];
  segments?: TimelineSegment[];
  isCompressed?: boolean;
}

const TimelineModal: React.FC<TimelineModalProps> = ({ isOpen, onClose }) => {
  const loc = useLoc();
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
    const categoryOrder: Record<string, number> = {
      "大型赛事": 1,
      "高校赛事": 2,
      "私立赛事": 3,
      "私立企划": 4
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
    
    segments.forEach(segment => {
      const segmentDays = Math.ceil((segment.end.getTime() - segment.start.getTime()) / (1000 * 60 * 60 * 24));
      const stepDays = segment.compressed ? Math.max(7, Math.floor(segmentDays / 3)) : 
                      segmentDays > 30 ? 3 : 1;
      
      const current = new Date(segment.start);
      while (current <= segment.end) {
        const segmentProgress = (current.getTime() - segment.start.getTime()) / (segment.end.getTime() - segment.start.getTime());
        const position = segment.startPosition + (segment.endPosition - segment.startPosition) * segmentProgress;
        
        scale.push({
          date: new Date(current),
          position,
          isMonth: current.getDate() === 1,
          isWeek: current.getDay() === 1 && stepDays >= 7,
          compressed: segment.compressed
        });
        
        current.setDate(current.getDate() + stepDays);
      }
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
  }, [isOpen]);

  // 获取当前语言的locale
  const getDateLocale = (): string => {
    const lang = localStorage.getItem("language") || "zh";
    const localeMap: Record<string, string> = {
      "zh": "zh-CN",
      "en": "en-US",
      "ja": "ja-JP",
      "ko": "ko-KR"
    };
    return localeMap[lang] || "zh-CN";
  };

  // 格式化日期显示
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(getDateLocale(), {
      month: "short",
      day: "numeric"
    });
  };

  // 格式化紧凑日期显示
  const formatCompactDate = (date: Date): string => {
    return date.toLocaleDateString(getDateLocale(), {
      month: "numeric",
      day: "numeric"  
    });
  };

  // 获取事件颜色
  const getEventColor = (event: TimelineEvent): string => {
    const baseColors: Record<string, string> = {
      "大型赛事": "#3b82f6",
      "私立赛事": "#10b981",
      "高校赛事": "#f59e0b",
      "私立企划": "#8b5cf6",
    };
    
    const baseColor = baseColors[event.category] || "#6b7280";
    
    if (event.isUpcoming) {
      const upcomingColors: Record<string, string> = {
        "#3b82f6": "#93c5fd",
        "#10b981": "#6ee7b7",
        "#f59e0b": "#fbbf24",
        "#8b5cf6": "#c4b5fd",
        "#6b7280": "#9ca3af"
      };
      return upcomingColors[baseColor] || "#9ca3af";
    }
    
    return baseColor;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="z-[1000] fixed inset-0 flex justify-center items-center bg-black/80 backdrop-blur-[12px] p-4 animate-[fadeIn_0.3s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="flex flex-col bg-[rgba(20,20,20,0.95)] shadow-[0_24px_80px_rgba(0,0,0,0.8),0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl border border-white/15 rounded-2xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="after:right-10 after:bottom-0 after:left-10 after:absolute relative flex justify-between items-center bg-[rgba(25,25,25,0.8)] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent px-10 py-8 pb-6 border-white/10 border-b after:h-px after:content-['']">
          <h2 className="flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] m-0 font-bold text-white text-2xl">
            {loc("EventTimeline", "活动时间轴")}
          </h2>
          <button 
            className="flex justify-center items-center bg-white/5 hover:bg-red-500/15 hover:shadow-[0_4px_16px_rgba(239,68,68,0.2)] backdrop-blur-lg p-3 border border-white/10 hover:border-red-500/30 rounded-xl w-12 h-12 text-white/70 hover:text-red-500 text-xl hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 bg-[rgba(15,15,15,0.3)] px-10 py-[60px] overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/30">
          {ongoingEvents.length === 0 ? (
            <div className="px-4 py-12 text-white/70 text-lg text-center">
              <p>{loc("NoActiveEvents", "暂无活跃的活动")}</p>
            </div>
          ) : (
            <>
              <div className="mb-8 py-6 text-center">
                <div className="flex flex-wrap justify-center gap-12 mb-6">
                  <span className="flex items-center gap-2 text-white/90 text-base">
                    <strong className="font-bold text-white text-lg">{ongoingEvents.length}</strong> {loc("ActiveEvents", "个活跃活动")}
                  </span>
                  <span className="flex items-center gap-2 text-white/90 text-base">
                    {loc("TimeSpan", "时间跨度")} <strong className="font-bold text-white text-lg">{timelineData.totalDays}</strong> {loc("Days", "天")}
                  </span>
                </div>
                <div className="flex justify-center items-center gap-6 font-semibold text-white/90 text-lg">
                  <span>
                    {timelineData.startDate && formatDate(timelineData.startDate)}
                  </span>
                  <span className="font-light text-white/60 text-xl">—</span>
                  <span>
                    {timelineData.endDate && formatDate(timelineData.endDate)}
                  </span>
                </div>
              </div>

              <div className="mb-10">
                <div className="relative overflow-hidden">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    {timelineData.timeScale.map((tick, index) => (
                      <div 
                        key={index}
                        className={`absolute top-0 bottom-0 ${
                          tick.isMonth ? 'w-px bg-white/15' : 
                          tick.isWeek ? 'w-px bg-white/8' : 
                          'w-px bg-white/3'
                        }`}
                        style={{ left: `${tick.position}%` }}
                      />
                    ))}
                  </div>
                  
                  {/* Events */}
                  <div className="flex flex-col gap-2 mr-0 px-2.5 py-5 pr-10 text-left">
                    {timelineData.events.map((event) => (
                      <div key={event.id} className="flex items-center gap-4 py-2 border-white/5 border-b last:border-b-0 min-h-10">
                        <div className="flex-[0_0_180px] text-center">
                          <div className="mb-1 overflow-hidden font-semibold text-[0.85rem] text-white text-ellipsis leading-tight whitespace-nowrap">
                            {event.title}
                          </div>
                          <div className="flex flex-col gap-0.5 text-[0.7rem]">
                            <span 
                              className="font-medium"
                              style={{ color: getEventColor(event) }}
                            >
                              {event.category}
                            </span>
                            <span className="text-[0.65rem] text-white/60">
                              {formatCompactDate(new Date(event.createDate))} - {formatCompactDate(new Date(event.endDate))}
                            </span>
                          </div>
                        </div>
                        <div className="relative flex-1 bg-white/[0.03] pr-0 border border-white/8 rounded-md h-6">
                          <a
                            href={event.href}
                            className="block top-0 after:top-1 after:right-1 hover:z-10 absolute after:absolute after:bg-white/30 after:opacity-0 hover:after:opacity-100 shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:brightness-115 rounded-md after:rounded-full after:w-3 h-full after:h-3 overflow-hidden no-underline after:content-[''] active:scale-[0.98] transition-all after:transition-opacity hover:-translate-y-0.5 active:-translate-y-px duration-300 after:duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] cursor-pointer"
                            style={{
                              left: `${event.startOffset}%`,
                              width: `${event.width}%`,
                              backgroundColor: getEventColor(event),
                            }}
                            title={`${event.title}\n${formatCompactDate(new Date(event.createDate))} - ${formatCompactDate(new Date(event.endDate))}\n${loc("Duration", "持续时间")} ${event.duration} ${loc("Days", "天")}\n${loc("ClickToViewDetails", "点击查看详情")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="relative flex items-center px-2 w-full h-full">
                              <span className="z-[2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] overflow-hidden font-semibold text-[0.7rem] text-white text-ellipsis whitespace-nowrap">
                                {event.title}
                              </span>
                              <div 
                                className="top-0 left-0 absolute bg-gradient-to-r from-white/20 via-white/10 to-white/20 opacity-60 rounded-md h-full"
                                style={{ width: '100%' }}
                              />
                            </div>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineModal;
