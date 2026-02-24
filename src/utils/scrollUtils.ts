/**
 * 滚动相关工具函数
 */
import { apiroot3 } from '../config/api';

/**
 * 平滑滚动到页面顶部
 */
export const scrollToTop = (): void => {
  const sTop = document.documentElement.scrollTop || document.body.scrollTop;
  
  if (sTop > 10) {
    window.requestAnimationFrame(scrollToTop);
    window.scrollTo(0, sTop - sTop / 9);
  }
};

/**
 * 创建难度点击回调函数（用于Unity游戏交互）
 * @param songid 歌曲ID
 * @param isPlayer 是否为玩家模式
 * @returns 点击事件处理函数
 */
export function makeLevelClickCallback(
  songid: string | number,
  isPlayer: boolean
): (e: React.MouseEvent<HTMLElement>) => void {
  return (e: React.MouseEvent<HTMLElement>) => {
    if (!isPlayer) return;
    
    scrollToTop();
    
    const maichart = `${apiroot3}/maichart/${songid}`;
    const maidata = `${maichart}/chart`;
    const track = `${maichart}/track`;
    const bg = `${maichart}/image?fullImage=true`;
    const mv = `${maichart}/video`;
    
    // 使用 currentTarget 而不是 target，确保获取到绑定事件的元素的 id
    // 这样即使点击了子元素（如难度名称或数值），也能正确获取父元素的 id
    const element = e.currentTarget as HTMLElement;
    const message = `${maidata}\n${track}\n${bg}\n${mv}\n${element.id}`;
    
    // 发送消息给Unity
    interface WindowWithUnity extends Window {
      unitySendMessage?: (obj: string, method: string, message: string) => void;
    }
    const windowWithUnity = window as WindowWithUnity;
    if (windowWithUnity.unitySendMessage) {
      windowWithUnity.unitySendMessage('HandleJSMessages', 'ReceiveMessage', message);
    }
  };
}
