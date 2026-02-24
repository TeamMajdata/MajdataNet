/**
 * RecentPlayedWidget 组件 - 最近游玩记录
 * 迁移自 legacy/src/app/widgets/RecentPlayedWidget.jsx
 */

import useSWR from 'swr';
import { apiroot3 } from '@/config/api';
import LazyLoad from 'react-lazy-load';
import { CoverPic, Level } from '@/components';
import { getComboState } from '@/utils';
import { useLoc } from '@/hooks';
import type { RecentPlayedWidgetProps, RecentPlayedData } from '@/types';


const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

/**
 * 最近游玩记录组件
 * 显示指定用户最近游玩的谱面及成绩
 */
export default function RecentPlayedWidget({ username }: RecentPlayedWidgetProps) {
  const loc = useLoc();
  
  const { data, error, isLoading } = useSWR<RecentPlayedData[]>(
    `${apiroot3}/account/Recent?username=${username}`,
    fetcher
  );

  if (error) return <div className="notReady">{loc('ServerError', '服务器错误')}</div>;

  if (isLoading) {
    return (
      <>
        <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-12.5 h-12.5 animate-[spin_0.1s_linear_infinite]"></div>
      </>
    );
  }

  if (!data || data.length === 0) return <p>{loc('NoRecentRecords', '暂无最近游玩记录')}</p>;

  const list = data.map((o) => (
    <div key={o.chartId} id={o.chartId} className="songCardWrapper">
      <LazyLoad height={165} width={352} offset={300}>
        <div className="bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] m-auto p-[0.8rem] rounded-[10px] w-[20rem] h-40 overflow-hidden transition-transform hover:-translate-y-1.25 duration-250 ease-in-out">
          <CoverPic id={o.chartId} />
          <div className="ml-[8.9rem]">
            <div className="songTitle" id={o.chartId}>
              <a href={'/song?id=' + o.chartId}>{o.title}</a>
            </div>

            <div className="songArtist">
              <a href={'/song?id=' + o.chartId}>
                {o.artist === '' || o.artist == null ? '-' : o.artist}
              </a>
            </div>

            <div className="songDesigner">
              <a href={'/space?id=' + o.uploader}>
                <img
                  className="smallIcon"
                  src={apiroot3 + '/account/Icon?username=' + o.uploader}
                  alt={o.uploader}
                />
                {o.designer}
              </a>
            </div>
            <Level
              level={o.level}
              difficulty={o.difficulty}
              songid={o.chartId}
              isPlayer={false}
            />
            <div className="songAcc" style={{ color: 'yellow' }}>
              {o.acc.toFixed(4)}
            </div>
            <br />
            <div className="songAcc">{getComboState(o.comboState)}</div>
          </div>
        </div>
      </LazyLoad>
    </div>
  ));

  return <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">{list}</div>;
}
