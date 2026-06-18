/**
 * UnifiedHeader 组件的样式常量（禁用动效）
 */

// 通用按钮样式
export const BUTTON_BASE =
  "flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm no-underline";

// 导航链接样式
export const NAV_LINK =
  "flex items-center gap-2 w-full px-4 py-3 font-medium text-gray-600 hover:text-[#5C8DC1] text-sm no-underline whitespace-nowrap transition-all duration-300 hover:scale-105 active:scale-95";

// 下拉菜单项样式
export const DROPDOWN_ITEM =
  "flex items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-left no-underline";

// 桌面侧边栏下拉菜单项样式
export const DESKTOP_DROPDOWN_ITEM =
  "flex flex-col items-center gap-1 px-3 py-3 no-underline font-medium text-sm relative bg-none cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group w-full";

// 汉堡菜单按钮样式
export const HAMBURGER_BUTTON_BASE =
  "flex items-center justify-center gap-2 px-3 md:px-4 rounded-[10px] cursor-pointer text-gray-600 text-sm font-medium h-10 md:h-12 backdrop-blur-[10px]";

export const HAMBURGER_BUTTON_ACTIVE =
  "bg-linear-to-br from-[#5C8DC1]/15 to-[#5C8DC1]/8 border-[#5C8DC1]/30 shadow-[0_8px_25px_rgb(0_0_0/10%),0_1px_0_rgb(92_141_193/15%)_inset]";

export const HAMBURGER_BUTTON_HOVER =
  "hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:border-[#5C8DC1]/20 hover:shadow-[0_8px_25px_rgb(0_0_0/8%),0_1px_0_rgb(92_141_193/10%)_inset]";

// 移动端下拉菜单项样式
export const MOBILE_DROPDOWN_ITEM =
  "flex items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-left no-underline";

// 分隔线样式
export const DIVIDER = "bg-black/8 my-2 h-px";
