/**
 * SongCard 组件 - 单曲卡片
 * 从 SongList 中提取，用于展示单首歌曲信息
 */

import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { CoverPic, InteractCount, Levels, TagManageWidget, LazyLoad } from '@/components';
import { endpoints } from '@/config/api';
import { useImpressionRef } from '@/hooks/useImpressionRef';
import { downloadSong } from '@/utils/download';
import { stripTmpTags, parseTmpRichText } from '@/utils/richTextUtils';
import type { Song, TagManageWidgetRef } from '@/types';
import { Link, useNavigate } from 'react-router-dom';
import { LuDownload, LuTag, LuTrash2 } from 'react-icons/lu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
        <div className={`marquee-host flex gap-3 ${disableLink && !onClick ? '' : 'cursor-pointer'} bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] p-2.5 rounded-2xl w-full h-36 overflow-hidden ring-1 ring-transparent hover:ring-white/30 transition-shadow duration-200`}>
          {/* 封面点击进入谱面详情；列表本身接管点击时（onClick/disableLink）只展示 */}
          <div className="relative h-full aspect-square shrink-0">
            <CoverPic
              id={song.id}
              display={isRanking ? 'No.' + (index + 1) : undefined}
              to={disableLink || onClick ? undefined : '/song?id=' + song.id}
              zoomable={false}
              radiusClassName="rounded-lg"
            />
            {/* 管理页：标签、删除按钮叠在封面右上角 */}
            {isManage && (
              <div className="top-1.5 right-1.5 absolute flex gap-1">
                <ManageActions songid={song.id} title={stripTmpTags(song.title) || song.title} />
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            {/* 悬停卡片时，被截断的标题/曲师/上传者向左循环滚动显示全文 */}
            <MarqueeText className="font-bold text-base leading-snug">
              {link('/song?id=' + song.id, parseTmpRichText(song.title))}
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
                <Levels levels={song.levels} songid={song.id} isPlayer={false} linkToSong={!(disableLink || onClick)} />
              </div>
              <button
                type="button"
                className={ICON_BUTTON}
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

/** 谱面管理页卡片上的操作：编辑标签、删除（删除前弹窗确认） */
const ICON_BUTTON = 'flex justify-center items-center hover:bg-white/10 -my-1 rounded-md w-7 h-7 text-white/55 hover:text-white transition-colors cursor-pointer shrink-0 touch-manipulation';
/** 叠在封面上的按钮：深色半透明底，保证在任何封面上都看得清 */
const COVER_BUTTON = 'grid place-items-center bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/15 rounded-lg w-7 h-7 text-white/85 hover:text-white transition-colors cursor-pointer';

const ManageActions = memo(function ManageActions({ songid, title }: { songid: string; title: string }) {
  const { t } = useTranslation();
  const tagWidget = useRef<TagManageWidgetRef>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const response = await fetch(endpoints.maichart.delete(songid), {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      });
      if (response.status !== 200) {
        toast.error((await response.text()) || t("song/SongCard.DeleteFailed"));
        return;
      }
      toast.success(t("song/SongCard.DeleteSuccess"));
      setConfirming(false);
      location.reload();
    } catch {
      toast.error(t("song/SongCard.DeleteFailed"));
    } finally {
      setDeleting(false);
    }
  }, [songid, t]);

  return (
    <>
      <button type="button" className={COVER_BUTTON} onClick={() => tagWidget.current?.openWindow()} aria-label={t("song/SongCard.Tags")} title={t("song/SongCard.Tags")}>
        <LuTag aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
      <button type="button" className={COVER_BUTTON + ' hover:bg-red-600/80! hover:border-red-400/50!'} onClick={() => setConfirming(true)} aria-label={t("song/SongCard.Delete")} title={t("song/SongCard.Delete")}>
        <LuTrash2 aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
      {/* 标签弹窗由 ref 打开，自带的触发按钮不显示 */}
      <div hidden><TagManageWidget ref={tagWidget} songid={songid} /></div>
      <ConfirmDialog
        open={confirming}
        danger
        busy={deleting}
        title={t("song/SongCard.DeleteTitle")}
        message={t("song/SongCard.DeleteMessage", { title })}
        confirmLabel={t("song/SongCard.Delete")}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
});
