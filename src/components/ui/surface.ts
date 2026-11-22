/**
 * 卡片外观：和谱面卡片（SongCard）一样的阴影和顶边高光，底是透明的。
 * 个人空间等页面里的各种卡片都用它，看起来是一套东西。
 * （以前写过 bg-[rgb(var(--background-start)/0.8)]，但 --background-start 是逗号分隔的 "20, 20, 20"，
 * 拼出来是无效颜色，浏览器一直忽略它，卡片实际上一直是透明的；去掉后外观不变）
 */
export const CARD_SURFACE_CLASS = 'shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] rounded-2xl';

/** 页面里各区块的小标题（例如个人空间概览里的“季赛战绩”“Best 50”“最近游玩”） */
export const SECTION_HEADING_CLASS = 'm-0 mb-3 font-semibold text-white! text-base! text-left!';
