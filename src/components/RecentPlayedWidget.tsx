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

interface RecentPlayedData {
  chartId: string;
  title: string;
  artist: string;
  uploader: string;
  designer: string;
  level: string;
  difficulty: string;
  acc: number;
  comboState: number;
}

export interface RecentPlayedWidgetProps {
  /** 用户名 */
  username: string;
}

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
        <div className="loading"></div>
      </>
    );
  }

  if (!data || data.length === 0) return <p>{loc('NoRecentRecords', '暂无最近游玩记录')}</p>;

  const list = data.map((o) => (
    <div key={o.chartId} id={o.chartId} className="songCardWrapper">
      <LazyLoad height={165} width={352} offset={300}>
        <div className="songCard">
          <CoverPic id={o.chartId} />
          <div className="songInfo">
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

  return <div className="songCardContainer">{list}</div>;
}
