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

// TMP 富文本工具
export { hasTmpTags, stripTmpTags, parseTmpRichText } from './richTextUtils';

// 活动数据工具
export {
  getNonFeaturedEventsCount,
  getEventById,
  getTimeAgo,
  getEventsWithTimeAgo,
  isEventUpcoming,
  isEventOngoing,
  getActiveEvents,
  getEventStatusText,
  getEventStatusClass,
  getCategoryTranslation,
  getEventBySearchKeyword,
} from './eventsData';
