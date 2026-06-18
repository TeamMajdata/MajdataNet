/**
 * UnifiedHeader 组件的样式常量（禁用动效）
 */

// 通用按钮样式
export const BUTTON_BASE =
  "flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm no-underline";

// 导航链接样式
export const NAV_LINK =
  "flex items-center gap-2 w-full bg-linear-to-r from-[#5C8DC1]/10 to-[#5C8DC1]/10 bg-no-repeat bg-[length:0%_100%] hover:bg-[length:100%_100%] px-4 py-3 border-l-3 border-transparent hover:border-[#5C8DC1] font-medium text-gray-600 hover:text-[#5C8DC1] text-sm no-underline whitespace-nowrap transition-all duration-400 ease-out hover:scale-105 active:scale-95";

// 下拉菜单项样式
export const DROPDOWN_ITEM =
  "flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline";

// 汉堡菜单按钮样式
export const HAMBURGER_BUTTON_BASE =
  "flex items-center justify-center gap-2 px-3 md:px-4 bg-black/5 border border-black/10 rounded-[10px] cursor-pointer text-gray-600 text-sm font-medium h-10 md:h-12 backdrop-blur-[10px]";

export const HAMBURGER_BUTTON_ACTIVE =
  "bg-linear-to-br from-[#5C8DC1]/15 to-[#5C8DC1]/8 border-[#5C8DC1]/30 shadow-[0_8px_25px_rgb(0_0_0/10%),0_1px_0_rgb(92_141_193/15%)_inset]";

export const HAMBURGER_BUTTON_HOVER =
  "hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:border-[#5C8DC1]/20 hover:shadow-[0_8px_25px_rgb(0_0_0/8%),0_1px_0_rgb(92_141_193/10%)_inset]";

// 移动端下拉菜单项样式
export const MOBILE_DROPDOWN_ITEM =
  "flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline";

// 分隔线样式
export const DIVIDER = "bg-black/8 my-2 h-px";
