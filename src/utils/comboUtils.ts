/**
 * Combo状态相关工具函数
 */
import { ComboState } from '../types';

/**
 * 获取Combo状态文本
 * @param state Combo状态数值
 * @returns Combo状态文本
 */
export function getComboState(state: number): string {
  switch (state) {
    case ComboState.None:
      return '';
    case ComboState.FC:
      return 'FC';
    case ComboState.FCPlus:
      return 'FC+';
    case ComboState.AP:
      return 'AP';
    case ComboState.APPlus:
      return 'AP+';
    default:
      return '';
  }
}
