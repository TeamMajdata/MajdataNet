/**
 * SongList 组件 - 歌曲列表
 * 迁移自 legacy/src/app/widgets/SongList.jsx
 */

import useSWR from 'swr';
import { useLoc } from '@/hooks';
import { CoverPic, InteractCount, Levels, TagManageWidget } from '@/components';
import { downloadSong } from '@/utils/download';
import LazyLoad from 'react-lazy-load';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import type { Song, SongListProps } from '@/types';


const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function SongList({ url, setMax, page, isRanking, isManage }: SongListProps) {
  const loc = useLoc();
  
  const { data, error, isLoading } = useSWR<Song[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  if (error) return <div className="m-auto w-full text-[50px] text-center">{loc('ServerError', '服务器错误')}</div>;
  if (isLoading) {
    return (
      <>
        <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-12.5 h-12.5 animate-[spin_0.1s_linear_infinite]"></div>
      </>
    );
  }

  const OnDownloadClick = (params: { id: string; title: string }) => async () => {
    await downloadSong({ id: params.id, title: params.title, toast: toast });
  };

  const SavePosition = ({ id, page }: { id: string; page?: number }) => {
    if (page == null) return;
    localStorage.setItem('lastclickid', id);
    localStorage.setItem('lastclickpage', page.toString());
  };

  if (data && data.length < 30 && data.length > 0) {
    if (page != null && setMax != null) setMax(page);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="m-auto w-full text-[50px] text-center">{loc('EmptyData', '暂无数据')}</div>;
  }

  const list = data.map((o, index) => (
    <div
      key={o.id}
      id={o.id}
      onClick={() => SavePosition({ id: o.id, page: page })}
      className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
    >
      <LazyLoad height={165} width={352} offset={300}>
        <div className="bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] m-auto p-[0.8rem] rounded-[10px] w-[20rem] h-40 overflow-hidden transition-transform hover:-translate-y-1.25 duration-250 ease-in-out">
          {isRanking ? (
            <CoverPic id={o.id} display={'No.' + (index + 1)} />
          ) : (
            <CoverPic id={o.id} />
          )}

          <div className="ml-[8.9rem]">
            <Tippy content={o.title}>
              <div className="mb-1.25 font-bold text-base truncate" id={o.id}>
                <a href={'/song?id=' + o.id}>{o.title}</a>
              </div>
            </Tippy>
            <Tippy content={o.artist}>
              <div className="mb-[0.3rem] text-[0.8rem] truncate italic">
                <a href={'/song?id=' + o.id}>
                  {o.artist === '' || o.artist == null ? '-' : o.artist}
                </a>
              </div>
            </Tippy>
            <Tippy content={o.uploader + '@' + o.designer}>
              <div className="mb-2 text-[0.8rem] truncate">
                <a href={'/space?id=' + o.uploader}>
                  <img
                    className="inline-block mx-[0.1rem] rounded-[1.3rem] w-[1.3rem] h-[1.3rem] overflow-hidden cursor-pointer select-none"
                    src={apiroot3 + '/account/Icon?username=' + o.uploader}
                    loading="lazy"
                    decoding="async"
                  />
                  {o.uploader + '@' + o.designer}
                </a>
              </div>
            </Tippy>
            {isManage ? (
              <>
                {' '}
                <Delbutton songid={o.id} />
                <TagManageWidget newClassName="mt-[0.1rem]" songid={o.id} />
              </>
            ) : (
              <Levels levels={o.levels} songid={o.id} isPlayer={false} />
            )}

            <br />
            <motion.div
              className="float-left m-[0.1rem] mt-2 border border-gray-500 rounded-[5px] w-[1.3rem] h-[1.3rem] overflow-hidden font-bold text-[0.65rem] text-center leading-[1.2rem] cursor-pointer select-none"
              onClick={OnDownloadClick({ id: o.id, title: o.title })}
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
            <InteractCount songid={o.id} />
          </div>
        </div>
      </LazyLoad>
    </div>
  ));
  return <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">{list}</div>;
}

function Delbutton({ songid }: { songid: string }) {
  return (
    <motion.div
      className="float-left m-[0.1rem] border border-gray-500 rounded-[5px] w-[1.3rem] h-[1.3rem] overflow-hidden font-bold text-[0.65rem] text-center leading-[1.2rem] cursor-pointer select-none"
      whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
      transition={{ duration: 0.125, ease: 'easeInOut' }}
      onClick={async () => {
        const ret = confirm('真的要删除吗(不可恢复)\n(没有任何机会)');
        if (ret) {
          const response = await fetch(apiroot3 + '/maichart/delete?chartId=' + songid, {
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
        }
      }}
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
}
