/**
 * SongCard 组件 - 单曲卡片
 * 从 SongList 中提取，用于展示单首歌曲信息
 */
import { memo, useCallback, useMemo } from "react";
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
  const titleRotation = useMemo(() => -(1 + (index % 5) * 0.4), [index]);
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
      className="flex justify-center hover:z-1001"
    >
      <LazyLoad height={165} width={165} offset={300}>
        <div className="flex gap-3 w-70 h-70 overflow-visible transition-transform hover:-translate-y-1.25 duration-250 ease-in-out">
          <div className="relative shrink-0 w-52 aspect-square">
            {isRanking ? (
              <CoverPic id={song.id} display={"No." + (index + 1)} />
            ) : (
              <CoverPic id={song.id} />
            )}
            <Tooltip content={stripTmpTags(song.title)}>
              <div
                className="absolute bottom-20 left-1/2 bg-white rounded-full w-64 shadow-md border border-gray-200 px-3 py-1.5 z-11" style={{ transform: `translateX(-50%) rotate(${titleRotation}deg)` }}
                id={song.id}
              >
                <div className="font-bold text-sm truncate text-center leading-tight">
                  {parseTmpRichText(song.title)}
                </div>
              </div>
            </Tooltip>
            <Tooltip content={song.artist}>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white rounded-full w-56 shadow-md border border-gray-200 px-3 py-1 z-10 rotate-2">
                <div className="text-xs text-gray-500 truncate text-center leading-tight">
                  {link(
                    "/song?id=" + song.id,
                    song.artist === "" || song.artist == null
                      ? "-"
                      : song.artist,
                  )}
                </div>
              </div>
            </Tooltip>
            <Tooltip content={song.uploader + "@" + song.designer}>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full w-48 shadow-md border border-gray-200 px-3 py-0.5 z-10 rotate-1">
                <div className="text-[10px] text-gray-400 truncate text-center leading-tight">
                  {link(
                    "/space?id=" + song.uploader,
                    song.uploader + "@" + song.designer,
                  )}
                </div>
              </div>
            </Tooltip>
            <motion.div
              className="absolute bottom-13 -right-13 z-10 flex items-center justify-center hover:bg-white border border-white/60 hover:border-[#5C8DC1]/30 w-12 h-12 rounded-full cursor-pointer select-none text-[#5C8DC1] hover:text-[#4A7DAF] backdrop-blur-[2px]"
              onClick={handleDownload}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.125, ease: "easeInOut" }}
            >
              <Download size={12} />
            </motion.div>
            <div className="absolute -top-4 left-0 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-md border border-gray-200">
              <InteractCount songid={song.id} />
            </div>
            <div className="absolute bottom-26 left-24 w-60 -translate-x-1/2 z-10">
              {isManage ? (
                <div className="flex items-center gap-1">
                  <Delbutton songid={song.id} />
                  <TagManageWidget
                    newClassName="mt-[0.1rem]"
                    songid={song.id}
                  />
                </div>
              ) : (
                <Levels
                  levels={song.levels}
                  songid={song.id}
                  isPlayer={false}
                />
              )}
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
