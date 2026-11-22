/**
 * 卡片底色：和谱面卡片（SongCard）相同的半透明深色底和阴影。
 * 个人空间等页面里的各种卡片都用它，看起来是一套东西。
 */
export const CARD_SURFACE_CLASS = 'bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] rounded-2xl';

/**
 * 没有外阴影的卡片底色：用在横向滑动的行里。Swiper 会裁掉自身以外的部分，
 * 大阴影被裁成卡片之间一块块硬边的暗色，所以不要外阴影，改用一层半透明深色底和顶边的高光把卡片托出来。
 * （--background-start 是逗号分隔的 "20, 20, 20"，要用 rgba(var(...), a) 才是有效颜色）
 */
export const CARD_SURFACE_FLAT_CLASS = 'bg-[rgba(var(--background-start),0.55)] shadow-[0_2px_0_rgb(255_255_255/8%)_inset] rounded-2xl';

/** 页面里各区块的小标题（例如个人空间概览里的“季赛战绩”“Best 50”“最近游玩”） */
export const SECTION_HEADING_CLASS = 'm-0 mb-3 font-semibold text-white! text-base! text-left!';
