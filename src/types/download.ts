/**
 * 下载工具相关类型定义
 */

import type { toast as toastType } from 'react-toastify';

// 获取文件参数接口
export interface FetchFileParams {
  url: string;
  fileName: string;
  toast: typeof toastType;
}

// 下载歌曲参数接口
export interface DownloadSongParams {
  id: string;
  title: string;
  toast: typeof toastType;
}
