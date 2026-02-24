/**
 * 活动数据处理工具函数
 */

import eventsDataRaw from '@/assets/data/events.json';
import { loc } from './i18n';
import type { Event, EventWithTimeInfo, CarouselEventsResult, EventCategory } from '@/types';

// 类型断言确保导入的数据符合类型
const eventsData: Event[] = eventsDataRaw as Event[];

/**
 * 获取所有活动数据
 */
export function getAllEvents(): Event[] {
  return eventsData;
}

/**
 * 获取活动总数
 */
export function getEventsCount(): number {
  return eventsData.length;
}

/**
 * 获取其他活动数量（除了主页轮播显示的）
 */
export function getNonFeaturedEventsCount(): number {
  const activeEvents = getActiveEvents();
  const displayedCount = Math.min(activeEvents.length, 2);
  return Math.max(0, eventsData.length - displayedCount);
}

/**
 * 根据ID获取单个活动
 */
export function getEventById(id: string): Event | undefined {
  return eventsData.find((event) => event.id === id);
}

/**
 * 获取当前语言的日期locale
 */
function getDateLocale(): string {
  if (typeof localStorage === 'undefined') return 'zh-CN'; // SSR环境默认值
  const lang = localStorage.getItem('language') || 'zh';
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
  };
  return localeMap[lang] || 'zh-CN';
}

/**
 * 智能计算时间差距（多少天前/后）
 */
export function getTimeAgo(createDate: string): string {
  const eventDate = new Date(createDate);
  const currentDate = new Date();
  const diffTime = eventDate.getTime() - currentDate.getTime(); // 不使用 Math.abs，保留正负号
  const diffDays = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
  const isFuture = diffTime > 0; // 判断是否为未来时间

  if (diffDays < 1) {
    return loc('TimeToday', '今天');
  } else if (diffDays === 1) {
    return isFuture ? `1${loc('TimeDaysLater', '天后')}` : `1${loc('TimeDaysAgo', '天前')}`;
  } else if (diffDays < 30) {
    return isFuture ? `${diffDays}${loc('TimeDaysLater', '天后')}` : `${diffDays}${loc('TimeDaysAgo', '天前')}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return isFuture ? `${months}${loc('TimeMonthsLater', '个月后')}` : `${months}${loc('TimeMonthsAgo', '个月前')}`;
  } else {
    const years = Math.floor(diffDays / 365);
    return isFuture ? `${years}${loc('TimeYearsLater', '年后')}` : `${years}${loc('TimeYearsAgo', '年前')}`;
  }
}

/**
 * 获取带智能时间显示的活动数据
 */
export function getEventsWithTimeAgo(): EventWithTimeInfo[] {
  return eventsData.map((event) => ({
    ...event,
    timeAgo: getTimeAgo(event.createDate),
    createDateFormatted: new Date(event.createDate).toLocaleDateString(
      getDateLocale(),
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    ),
  }));
}

/**
 * 检查活动是否即将开始（createDate在未来）
 */
export function isEventUpcoming(event: Event): boolean {
  const currentDate = new Date();
  const createDate = new Date(event.createDate);
  return currentDate < createDate;
}

/**
 * 检查活动是否正在进行中（基于当前日期、创建日期和结束日期）
 */
export function isEventOngoing(event: Event): boolean {
  const currentDate = new Date();
  const createDate = new Date(event.createDate);
  const endDate = new Date(event.endDate);
  return currentDate >= createDate && currentDate <= endDate;
}

/**
 * 获取所有进行中的活动（已经开始且未结束的活动）
 */
export function getOngoingEvents(): Event[] {
  return eventsData.filter((event) => isEventOngoing(event));
}

/**
 * 获取所有活跃的活动（进行中 + 即将开始的活动）
 */
export function getActiveEvents(): Event[] {
  return eventsData.filter((event) => isEventOngoing(event) || isEventUpcoming(event));
}

/**
 * 获取所有即将开始的活动
 */
export function getUpcomingEvents(): Event[] {
  return eventsData.filter((event) => isEventUpcoming(event));
}

/**
 * 获取所有已结束的活动
 */
export function getEndedEvents(): Event[] {
  return eventsData.filter((event) => !isEventOngoing(event) && !isEventUpcoming(event));
}

/**
 * 智能轮播管理器 - 用于主页活动展示
 */
class EventCarouselManager {
  private currentIndex = 0;
  private eventPool: EventWithTimeInfo[] = [];
  private displayedEvents: EventWithTimeInfo[] = [];
  private isInitialized = false;

  /**
   * 初始化事件池
   */
  initialize(): CarouselEventsResult {
    const activeEvents = getActiveEvents();

    if (activeEvents.length === 0) {
      // 没有活跃的活动，使用最新的活动
      const recentEvents = getEventsWithTimeAgo()
        .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime())
        .slice(0, 2);
      this.eventPool = recentEvents;
      this.displayedEvents = [...this.eventPool];
      this.isInitialized = true;
      return { events: this.displayedEvents, shouldRotate: false };
    }

    // 为每个活动添加时间信息，并按优先级排序（进行中的活动优先，然后是即将开始的）
    this.eventPool = activeEvents
      .sort((a, b) => {
        const aOngoing = isEventOngoing(a);
        const bOngoing = isEventOngoing(b);

        // 进行中的活动优先级更高
        if (aOngoing && !bOngoing) return -1;
        if (!aOngoing && bOngoing) return 1;

        // 同类型活动按创建时间排序（最新的在前）
        return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
      })
      .map((event) => ({
        ...event,
        timeAgo: getTimeAgo(event.createDate),
        createDateFormatted: new Date(event.createDate).toLocaleDateString(
          getDateLocale(),
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        ),
      }));

    // 初始显示前两个
    this.displayedEvents = this.eventPool.slice(0, 2);
    this.isInitialized = true;

    return {
      events: this.displayedEvents,
      shouldRotate: this.eventPool.length > 2,
    };
  }

  /**
   * 获取下一组活动（智能轮播）
   */
  getNextEvents(): CarouselEventsResult {
    if (!this.isInitialized) {
      return this.initialize();
    }

    // 如果活动数量 <= 2，不进行轮播
    if (this.eventPool.length <= 2) {
      return {
        events: this.displayedEvents,
        shouldRotate: false,
      };
    }

    // 滚动式轮播：每次只换一个活动
    this.currentIndex = (this.currentIndex + 1) % this.eventPool.length;

    // 计算新的两个活动位置
    const firstIndex = this.currentIndex;
    const secondIndex = (this.currentIndex + 1) % this.eventPool.length;

    this.displayedEvents = [
      this.eventPool[firstIndex],
      this.eventPool[secondIndex],
    ];

    return {
      events: this.displayedEvents,
      shouldRotate: true,
    };
  }

  /**
   * 重置管理器（当活动数据更新时调用）
   */
  reset(): void {
    this.currentIndex = 0;
    this.eventPool = [];
    this.displayedEvents = [];
    this.isInitialized = false;
  }
}

// 创建全局轮播管理器实例
const carouselManager = new EventCarouselManager();

/**
 * 获取轮播活动数据（供组件使用）
 */
export function getCarouselEvents(): CarouselEventsResult {
  return carouselManager.initialize();
}

/**
 * 获取下一组轮播活动
 */
export function getNextCarouselEvents(): CarouselEventsResult {
  return carouselManager.getNextEvents();
}

/**
 * 重置轮播状态（当活动数据变化时使用）
 */
export function resetCarousel(): void {
  carouselManager.reset();
}

/**
 * 检查是否应该进行轮播
 */
export function shouldEnableCarousel(): boolean {
  const activeEvents = getActiveEvents();
  return activeEvents.length > 2;
}

/**
 * 保留原有函数作为兼容（已废弃，建议使用新的轮播管理器）
 * @deprecated 使用 getCarouselEvents() 替代
 */
export function getRandomOngoingEvents(): EventWithTimeInfo[] {
  const result = carouselManager.initialize();
  return result.events;
}

/**
 * 获取活动状态的显示文本（支持多语言）
 */
export function getEventStatusText(event: Event): string {
  if (isEventUpcoming(event)) {
    return loc('EventStatusUpcoming', '即将开始');
  }
  if (isEventOngoing(event)) {
    return loc('EventStatusOngoing', '进行中');
  }
  return loc('EventStatusEnded', '已结束');
}

/**
 * 获取活动状态的样式类名
 */
export function getEventStatusClass(event: Event): string {
  if (isEventUpcoming(event)) {
    return 'status-upcoming';
  }
  if (isEventOngoing(event)) {
    return 'status-ongoing';
  }
  return 'status-ended';
}

/**
 * 获取活动类型的翻译（支持多语言）
 */
export function getCategoryTranslation(category: EventCategory): string {
  const categoryMap: Record<EventCategory, string> = {
    高校赛事: loc('EventCategoryUniversity', '高校赛事'),
    大型赛事: loc('EventCategoryMajor', '大型赛事'),
    私立企划: loc('EventCategoryPrivateProject', '私立企划'),
    私立赛事: loc('EventCategoryPrivateContest', '私立赛事'),
  };
  return categoryMap[category] || category;
}

// 预构建搜索关键词到活动的映射表（性能优化）
let searchKeywordToEventMap: Map<string, Event> | null = null;

function buildSearchKeywordMap(): Map<string, Event> {
  if (searchKeywordToEventMap) return searchKeywordToEventMap;

  searchKeywordToEventMap = new Map();

  eventsData.forEach((event) => {
    // 检查href是否包含search参数
    if (event.href && event.href.includes('?search=')) {
      try {
        const searchParam = event.href.split('?search=')[1];
        // URL解码
        const decodedSearchParam = decodeURIComponent(searchParam);
        searchKeywordToEventMap!.set(decodedSearchParam, event);
      } catch {
        // 忽略URL解码错误
        console.warn('Failed to decode search parameter:', event.href);
      }
    }

    // 检查href是否包含eventTag页面的链接格式
    if (event.href && event.href.includes('/eventTag?id=')) {
      try {
        const idParam = event.href.split('/eventTag?id=')[1];
        // URL解码
        const decodedIdParam = decodeURIComponent(idParam);
        // 使用eventId作为键来映射活动（用于eventTag页面查找活动信息）
        searchKeywordToEventMap!.set(decodedIdParam, event);
      } catch {
        // 忽略URL解码错误
        console.warn('Failed to decode eventTag parameter:', event.href);
      }
    }
  });

  return searchKeywordToEventMap;
}

/**
 * 根据搜索关键词获取对应的活动（高性能版本）
 */
export function getEventBySearchKeyword(searchKeyword: string): Event | null {
  if (!searchKeyword) return null;

  const map = buildSearchKeywordMap();
  return map.get(searchKeyword) || null;
}
