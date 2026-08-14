/**
 * SongMosaicCard 组件 - 主页同款马赛克谱面卡片
 * 8:3 直角大图 + hover 反色符号 + 难度徽章 + 下载按钮 + 标题 + 互动计数
 * 列跨度由调用方通过 className 控制（grid 子项或 col-span-*）
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { InteractCount, Levels } from '@/components';
import { endpoints } from '@/config/api';
import { downloadSong } from '@/utils/download';
import { stripTmpTags } from '@/utils/richTextUtils';
import type { Song } from '@/types';

interface SongMosaicCardProps {
  song: Song;
  index: number;
  page?: number;
  /** 外层类名（如 col-span-4） */
  className?: string;
}

export default function SongMosaicCard({ song, index, page = 0, className = '' }: SongMosaicCardProps) {
  const aspect = 'aspect-[8/3]';

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: (index % 5) * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link
        to={'/song?id=' + song.id}
        className="group block no-underline"
        onClick={() => {
          localStorage.setItem('lastclickid', song.id);
          localStorage.setItem('lastclickpage', page.toString());
        }}
      >
        {/* 直角大图 + hover 叠加符号（mix-blend 反色） */}
        <div className={`relative overflow-hidden ${aspect}`}>
          <img
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            src={endpoints.maichart.image(song.id)}
            alt={stripTmpTags(song.title)}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-5xl md:text-6xl font-light text-white mix-blend-difference select-none">
              +
            </span>
          </div>
          {/* 难度徽章（叠加在图片右上角） */}
          <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center max-w-[60%]">
            <Levels levels={song.levels} songid={song.id} isPlayer={false} />
          </div>
          {/* 下载按钮（透明背景） */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              downloadSong({ id: song.id, title: stripTmpTags(song.title), toast });
            }}
            className="absolute bottom-3 right-3 z-10 flex items-center justify-center rounded-full w-12 h-12 text-white cursor-pointer transition-all duration-150 hover:text-primary hover:bg-white/15"
            aria-label="download"
          >
            <Download size={20} />
          </button>
        </div>

        {/* 信息区：标题 + 艺术家/上传者 + 互动 */}
        <div className="flex items-start justify-between gap-3 mt-3">
          <h3 className="m-0 font-semibold text-ink text-base md:text-lg truncate leading-snug">
            {stripTmpTags(song.title)}
          </h3>
          <span className="shrink-0 w-0 h-0.5 mt-2 bg-primary transition-all duration-300 group-hover:w-8" />
        </div>
        <p className="m-0 mt-1 text-xs text-ink-3 truncate">
          {song.artist === '' || song.artist == null ? '-' : song.artist} · {song.uploader}
        </p>
        <div className="mt-3">
          <InteractCount songid={song.id} />
        </div>
      </Link>
    </motion.div>
  );
}
