/**
 * 歌曲相关类型定义
 */

// 歌曲摘要接口
export interface SongSummary {
  id: string;
  title: string;
  artist: string;
  uploader: string;
  designer: string;
  levels: (string | null)[];
  tags: string[];
  publicTags: string[];
  hash: string;
  timestamp: string;
}

// 歌曲接口
export interface Song {
  id: string;
  title: string;
  artist: string;
  uploader: string;
  designer: string;
  levels: string[];
  hash: string;
}
