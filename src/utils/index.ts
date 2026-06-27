/**
 * 工具函数统一导出
 */

// 基础工具
export { default as sleep } from './sleep';

// 难度等级工具
export { getLevelName, formatLevel } from './levelUtils';
export { renderLevel } from './renderLevel';

// Combo工具
export { getComboState } from './comboUtils';

// 认证工具
export { handleLogout } from './authUtils';

// 滚动工具
export { scrollToTop, makeLevelClickCallback } from './scrollUtils';

// 下载工具
export { downloadSong } from './download';

// HTTP 消息工具
export { getDisplayMessage } from './httpMessage';

// 国际化工具
export {
  setLanguage,
  getTranslatedString,
  loc,
  getCurrentLanguage,
  getBrowserLanguage,
  initializeLanguage,
  preloadLanguage,
} from './i18n';

// TMP 富文本工具
export { hasTmpTags, stripTmpTags, parseTmpRichText, TmpRichText } from './richTextUtils';

// 活动数据工具
export {
  getAllEvents,
  getEventsCount,
  getNonFeaturedEventsCount,
  getEventById,
  getTimeAgo,
  getEventsWithTimeAgo,
  isEventUpcoming,
  isEventOngoing,
  getOngoingEvents,
  getActiveEvents,
  getUpcomingEvents,
  getEndedEvents,
  getCarouselEvents,
  getNextCarouselEvents,
  resetCarousel,
  shouldEnableCarousel,
  getRandomOngoingEvents,
  getEventStatusText,
  getEventStatusClass,
  getCategoryTranslation,
  getEventBySearchKeyword,
} from './eventsData';
