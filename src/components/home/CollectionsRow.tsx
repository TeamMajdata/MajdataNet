import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { LuChevronRight } from 'react-icons/lu';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import CollectionTile from './CollectionTile';
import TileRow from './TileRow';
import type { Collection } from '@/types';

const COUNT = 12;

/**
 * 首页“歌单广场”横栏：歌单广场第一页的歌单，和上面的谱面横栏同一种版式（大封面、横向自由滑动），
 * 卡片做成播放列表的样子；标题旁边可以进入完整的歌单广场。
 */
export default function CollectionsRow() {
  const { t } = useTranslation();
  const { data } = useSWR<Collection[]>(endpoints.collection.list(0, COUNT), apiFetcher, { revalidateOnFocus: false });
  if (data && data.length === 0) return null;

  return (
    <TileRow
      id="home-collections"
      title={t('home/HomeHighlights.Collections')}
      hint={
        <span className="flex flex-wrap items-center gap-x-2">
          {t('home/HomeHighlights.CollectionsHint')}
          <Link to="/collection/hiroba" className="inline-flex items-center text-sky-300/80 hover:text-sky-200 no-underline">
            {t('home/HomeHighlights.ViewAll')}<LuChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
          </Link>
        </span>
      }
      items={data}
      itemKey={(collection) => collection.id}
      renderItem={(collection) => <CollectionTile collection={collection} />}
    />
  );
}
