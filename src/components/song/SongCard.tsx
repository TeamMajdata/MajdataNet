/**
 * SongCard 组件 - 单曲卡片
 * 从 SongList 中提取，用于展示单首歌曲信息
 */

import { memo, useCallback } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  CoverPic,
  InteractCount,
  Levels,
  TagManageWidget,
  LazyLoad,
  Tooltip,
} from "@/components";
import { endpoints } from "@/config/api";
import { downloadSong } from "@/utils/download";
import { stripTmpTags, parseTmpRichText } from "@/utils/richTextUtils";
import type { Song } from "@/types";
import { Download, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface SongCardProps {
  song: Song;
  index: number;
  isRanking?: boolean;
  isManage?: boolean;
  page?: number;
  disableLink?: boolean;
  onClick?: (song: Song) => void;
}

const SongCard = memo(function SongCard({
  song,
  index,
  isRanking,
  isManage,
  page,
  disableLink,
  onClick,
}: SongCardProps) {
  const navigate = useNavigate();
  const savePosition = useCallback(() => {
    if (page == null) return;
    localStorage.setItem("lastclickid", song.id);
    localStorage.setItem("lastclickpage", page.toString());
  }, [song.id, page]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(song);
    } else if (!disableLink) {
      savePosition();
      navigate("/song?id=" + song.id);
    }
  }, [onClick, song, savePosition, navigate, disableLink]);

  const handleDownload = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      await downloadSong({
        id: song.id,
        title: stripTmpTags(song.title),
        toast,
      });
    },
    [song.id, song.title],
  );

  const link = (to: string, children: React.ReactNode) =>
    disableLink || onClick ? (
      <span>{children}</span>
    ) : (
      <Link to={to}>{children}</Link>
    );

  return (
    <div
      id={song.id}
      onClick={handleClick}
      className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
    >
      <LazyLoad height={165} width={352} offset={300}>
        <div className="flex gap-3 w-[20rem] h-30 overflow-visible transition-transform hover:-translate-y-1.25 duration-250 ease-in-out">
          <div className="relative shrink-0 w-[7.5rem] aspect-square">
            {isRanking ? (
              <CoverPic id={song.id} display={"No." + (index + 1)} />
            ) : (
              <CoverPic id={song.id} />
            )}
            <motion.div
              className="absolute bottom-1 right-1 z-10 flex items-center justify-center bg-white/80 hover:bg-white border border-white/60 hover:border-[#5C8DC1]/30 rounded-[4px] w-5 h-5 cursor-pointer select-none text-[#5C8DC1] hover:text-[#4A7DAF] backdrop-blur-[2px]"
              onClick={handleDownload}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.125, ease: "easeInOut" }}
            >
              <Download size={12} />
            </motion.div>
          </div>

          <div className="flex flex-col flex-1 min-w-0 py-0.5">
            <Tooltip content={stripTmpTags(song.title)}>
              <div
                className="mb-1 font-bold text-sm truncate leading-tight"
                id={song.id}
              >
                {link("/song?id=" + song.id, parseTmpRichText(song.title))}
              </div>
            </Tooltip>
            <Tooltip content={song.artist}>
              <div className="mb-[0.15rem] text-[0.8rem] text-gray-500 truncate italic leading-snug">
                {link(
                  "/song?id=" + song.id,
                  song.artist === "" || song.artist == null ? "-" : song.artist,
                )}
              </div>
            </Tooltip>
            <Tooltip content={song.uploader + "@" + song.designer}>
              <div className="mb-1.5 text-[0.75rem] text-gray-400 truncate leading-snug">
                {link(
                  "/space?id=" + song.uploader,
                  song.uploader + "@" + song.designer,
                )}
              </div>
            </Tooltip>
            {isManage ? (
              <div className="flex items-center gap-1 mt-auto">
                <Delbutton songid={song.id} />
                <TagManageWidget newClassName="mt-[0.1rem]" songid={song.id} />
              </div>
            ) : (
              <div className="mt-auto">
                <Levels
                  levels={song.levels}
                  songid={song.id}
                  isPlayer={false}
                />
              </div>
            )}

            <div className="mt-1.5">
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
    const ret = confirm("真的要删除吗(不可恢复)\n(没有任何机会)");
    if (!ret) return;
    const response = await fetch(endpoints.maichart.delete(songid), {
      method: "POST",
      mode: "cors",
      credentials: "include",
    });
    if (response.status !== 200) {
      alert(await response.text());
      return;
    }
    alert("删除成功");
    if (typeof window !== "undefined") {
      location.reload();
    }
  }, [songid]);

  return (
    <motion.div
      className="float-left m-[0.1rem] flex items-center justify-center border border-gray-200 hover:border-[#5C8DC1]/30 rounded-[5px] w-[1.3rem] h-[1.3rem] cursor-pointer select-none text-[#5C8DC1]"
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.125, ease: "easeInOut" }}
      onClick={handleDelete}
    >
      <Trash2 size={12} />
    </motion.div>
  );
});
