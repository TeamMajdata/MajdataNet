/**
 * SongCard 组件 - 单曲卡片
 * 从 SongList 中提取，用于展示单首歌曲信息
 */

import { memo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { CoverPic, InteractCount, Levels, TagManageWidget, LazyLoad } from '@/components';
import { endpoints } from '@/config/api';
import { useImpressionRef } from '@/hooks/useImpressionRef';
import { downloadSong } from '@/utils/download';
import { stripTmpTags, parseTmpRichText } from '@/utils/richTextUtils';
import type { Song } from '@/types';
import { Link, useNavigate } from 'react-router-dom';
import { LuDownload } from 'react-icons/lu';
import MarqueeText from '@/components/ui/MarqueeText';

interface SongCardProps {
  song: Song;
  index: number;
  isRanking?: boolean;
  isManage?: boolean;
  disableLink?: boolean;
  onClick?: (song: Song) => void;
}

const SongCard = memo(function SongCard({ song, index, isRanking, isManage, disableLink, onClick }: SongCardProps) {
  // 只在 ImpressionScope 内生效，其他列表中为空操作
  const impressionRef = useImpressionRef(song.hash);

  // 列表位置（搜索词/排序/页码）已在首页 URL 中，浏览器回退即可还原，无需本地记录
  const navigate = useNavigate();
  const songHref = '/song?id=' + song.id;
  // 整张卡片可点进谱面页；难度标签、上传者、下载等自身可交互的元素各管各的
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(song);
      return;
    }
    if (disableLink) return;
    if ((event.target as HTMLElement).closest('a, button, input, select, textarea, [role="button"]')) return;
    // 选中文字时不跳转
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey) window.open(songHref, '_blank', 'noopener');
    else navigate(songHref);
  }, [onClick, song, disableLink, navigate, songHref]);

  const handleDownload = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await downloadSong({ id: song.id, title: stripTmpTags(song.title), toast });
  }, [song.id, song.title]);

  const link = (to: string, children: React.ReactNode) =>
    disableLink || onClick ? <span>{children}</span> : <Link to={to}>{children}</Link>;

  return (
    <div
      ref={impressionRef}
      id={song.id}
      onClick={handleClick}
      className="flex justify-center w-full min-w-0"
    >
      <LazyLoad height={144} offset={300}>
        <div className={`marquee-host flex gap-3 ${disableLink && !onClick ? '' : 'cursor-pointer'} bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] p-2.5 rounded-2xl w-full h-36 overflow-hidden transition-transform md:hover:-translate-y-1.25 duration-250 ease-in-out`}>
          {/* 封面点击进入谱面详情；列表本身接管点击时（onClick/disableLink）只展示 */}
          <div className="relative h-full aspect-square shrink-0">
            <CoverPic
              id={song.id}
              display={isRanking ? 'No.' + (index + 1) : undefined}
              to={disableLink || onClick ? undefined : '/song?id=' + song.id}
              zoomable={false}
              radiusClassName="rounded-lg"
            />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            {/* 悬停卡片时，被截断的标题/曲师/上传者来回滚动显示全文 */}
            <MarqueeText className="font-bold text-base leading-snug">
              <span id={song.id}>{link('/song?id=' + song.id, parseTmpRichText(song.title))}</span>
            </MarqueeText>
            <MarqueeText className="mt-0.5 text-[0.8rem] text-white/70">
              {link('/song?id=' + song.id, song.artist === '' || song.artist == null ? '-' : song.artist)}
            </MarqueeText>
            <MarqueeText className="mt-0.5 text-[0.8rem] text-white/70">
              {disableLink || onClick ? (
                song.uploader + '@' + song.designer
              ) : (
                <Link to={'/space?id=' + song.uploader} className="hover:underline underline-offset-2 decoration-white/60">
                  {song.uploader + '@' + song.designer}
                </Link>
              )}
            </MarqueeText>
            <div className="flex items-start gap-1 mt-1.5">
              <div className="flex-1 min-w-0">
                {isManage ? (
                  <>
                    <Delbutton songid={song.id} />
                    <TagManageWidget newClassName="mt-[0.1rem]" songid={song.id} />
                  </>
                ) : (
                  <Levels levels={song.levels} songid={song.id} isPlayer={false} linkToSong={!(disableLink || onClick)} />
                )}
              </div>
              <button
                type="button"
                className="flex justify-center items-center hover:bg-white/10 -my-1 rounded-md w-7 h-7 text-white/55 hover:text-white transition-colors cursor-pointer shrink-0 touch-manipulation"
                onClick={handleDownload}
                aria-label="Download"
              >
                <LuDownload aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-auto">
              <InteractCount songid={song.id} />
            </div>
          </div>
        </div>
      </LazyLoad>
    </div>
  );
});

export default SongCard;

const Delbutton = memo(function Delbutton({ songid }: { songid: string }) {
  const handleDelete = useCallback(async () => {
    const ret = confirm('真的要删除吗(不可恢复)\n(没有任何机会)');
    if (!ret) return;
    const response = await fetch(endpoints.maichart.delete(songid), {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
    });
    if (response.status !== 200) {
      alert(await response.text());
      return;
    }
    alert('删除成功');
    if (typeof window !== 'undefined') {
      location.reload();
    }
  }, [songid]);

  return (
    <motion.div
      className="float-left m-[0.1rem] border border-gray-500 rounded-[5px] w-[1.3rem] h-[1.3rem] overflow-hidden font-bold text-[0.65rem] text-center leading-[1.2rem] cursor-pointer select-none"
      whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
      transition={{ duration: 0.125, ease: 'easeInOut' }}
      onClick={handleDelete}
    >
      <svg
        className="fill-white stroke-white p-0.75 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        width="24"
        viewBox="-30 -30 512 512"
      >
        <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
      </svg>
    </motion.div>
  );
});
