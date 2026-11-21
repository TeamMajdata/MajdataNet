/**
 * 下载工具相关类型定义
 */

import type { toast as toastType } from 'react-toastify';

// 下载歌曲参数接口
export interface DownloadSongParams {
  id: string;
  title: string;
  toast: typeof toastType;
}
