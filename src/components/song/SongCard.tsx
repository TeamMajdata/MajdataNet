/**
 * SongCard 组件 - 单曲卡片
 * 从 SongList 中提取，用于展示单首歌曲信息
 */

import { memo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { CoverPic, InteractCount, Levels, TagManageWidget, LazyLoad, Tooltip } from '@/components';
import { endpoints } from '@/config/api';
import { downloadSong } from '@/utils/download';
import type { Song } from '@/types';
import { Link } from 'react-router-dom';

interface SongCardProps {
  song: Song;
  index: number;
  isRanking?: boolean;
  isManage?: boolean;
  page?: number;
  disableLink?: boolean;
}

const SongCard = memo(function SongCard({ song, index, isRanking, isManage, page, disableLink }: SongCardProps) {
  const savePosition = useCallback(() => {
    if (page == null) return;
    localStorage.setItem('lastclickid', song.id);
    localStorage.setItem('lastclickpage', page.toString());
  }, [song.id, page]);

  const handleDownload = useCallback(async () => {
    await downloadSong({ id: song.id, title: song.title, toast });
  }, [song.id, song.title]);

  const link = (to: string, children: React.ReactNode) =>
    disableLink ? <span>{children}</span> : <Link to={to}>{children}</Link>;

  return (
    <div
      id={song.id}
      onClick={savePosition}
      className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
    >
      <LazyLoad height={165} width={352} offset={300}>
        <div className="bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] m-auto p-[0.8rem] rounded-[10px] w-[20rem] h-40 overflow-hidden transition-transform hover:-translate-y-1.25 duration-250 ease-in-out">
          {isRanking ? (
            <CoverPic id={song.id} display={'No.' + (index + 1)} />
          ) : (
            <CoverPic id={song.id} />
          )}

          <div className="ml-[8.9rem]">
            <Tooltip content={song.title}>
              <div className="mb-1.25 font-bold text-base truncate" id={song.id}>
                {link('/song?id=' + song.id, song.title)}
              </div>
            </Tooltip>
            <Tooltip content={song.artist}>
              <div className="mb-[0.3rem] text-[0.8rem] truncate italic">
                {link('/song?id=' + song.id, song.artist === '' || song.artist == null ? '-' : song.artist)}
              </div>
            </Tooltip>
            <Tooltip content={song.uploader + '@' + song.designer}>
              <div className="mb-2 text-[0.8rem] truncate">
                {link('/space?id=' + song.uploader, song.uploader + '@' + song.designer)}
              </div>
            </Tooltip>
            {isManage ? (
              <>
                {' '}
                <Delbutton songid={song.id} />
                <TagManageWidget newClassName="mt-[0.1rem]" songid={song.id} />
              </>
            ) : (
              <Levels levels={song.levels} songid={song.id} isPlayer={false} />
            )}

            <br />
            <motion.div
              className="float-left m-[0.1rem] mt-2 border border-gray-500 rounded-[5px] w-[1.3rem] h-[1.3rem] overflow-hidden font-bold text-[0.65rem] text-center leading-[1.2rem] cursor-pointer select-none"
              onClick={handleDownload}
              whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
              transition={{ duration: 0.125, ease: 'easeInOut' }}
            >
              <svg
                className="fill-white stroke-white w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
              >
                <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
              </svg>
            </motion.div>
            <InteractCount songid={song.id} />
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
