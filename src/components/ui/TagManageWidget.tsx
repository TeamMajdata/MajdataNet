/**
 * TagManageWidget 组件 - Tag管理小部件
 */

import { useTranslation } from 'react-i18next';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from 'react';
import React from 'react';
import Modal from './Modal';
import { LuPlus, LuX } from 'react-icons/lu';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import sleep from '@/utils/sleep';
import { MAX_CHART_TAGS, saveChartTags } from '@/utils/chartTags';
import { ApiError } from '@/utils/apiClient';
import { CODE_TOO_MANY_ELEMENTS } from '@/config/apiRetCode';
import { motion } from 'framer-motion';
import type {
  TagManageWidgetProps,
  TagManageWidgetRef,
  TagManageButtonProps,
  TagManageWindowProps
} from '@/types';

const TagManageWidget = forwardRef<TagManageWidgetRef, TagManageWidgetProps>(
  function TagManageWidget({ songid, newClassName = '' }, ref) {
    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const windowRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      toggleWindow: () => setIsWindowOpen((prev) => !prev),
      openWindow: () => setIsWindowOpen(true),
      closeWindow: () => setIsWindowOpen(false),
    }));

    return (
      <motion.div
        className={`float-left text-center rounded-[5px] font-bold m-[0.1rem] mt-2 w-[1.3rem] h-[1.3rem] text-[0.65rem] leading-[1.2rem] border border-gray-500 overflow-hidden cursor-pointer select-none ${newClassName}`}
        whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
        transition={{ duration: 0.125, ease: 'easeInOut' }}
      >
        <TagManageButton
          ref={buttonRef}
          onClick={() => setIsWindowOpen(!isWindowOpen)}
        />
        <Modal
          open={isWindowOpen}
          onClose={() => setIsWindowOpen(false)}
          labelledBy="tag-manage-title"
          className="flex flex-col max-w-lg max-h-[85vh] overflow-hidden"
        >
          <TagManageWindow
            ref={windowRef}
            onClose={() => setIsWindowOpen(false)}
            buttonRef={buttonRef}
            songid={songid}
          />
        </Modal>
      </motion.div>
    );
  }
);

export default TagManageWidget;

const TagManageButton = forwardRef<HTMLDivElement, TagManageButtonProps>(
  function TagManageButton({ onClick, newClassName }, ref) {
    return (
      <div ref={ref} onClick={onClick} className={`fill-white stroke-white w-full h-full p-0.75 ${newClassName || ''}`}>
        <svg
          className="fill-white stroke-white w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          height="24"
          viewBox="-20 -20 512 512"
          width="24"
        >
          <path d="M345 39.1L472.8 168.4c52.4 53 52.4 138.2 0 191.2L360.8 472.9c-9.3 9.4-24.5 9.5-33.9 .2s-9.5-24.5-.2-33.9L438.6 325.9c33.9-34.3 33.9-89.4 0-123.7L310.9 72.9c-9.3-9.4-9.2-24.6 .2-33.9s24.6-9.2 33.9 .2zM0 229.5L0 80C0 53.5 21.5 32 48 32l149.5 0c17 0 33.3 6.7 45.3 18.7l168 168c25 25 25 65.5 0 90.5L277.3 442.7c-25 25-65.5 25-90.5 0l-168-168C6.7 262.7 0 246.5 0 229.5zM144 144a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
        </svg>
      </div>
    );
  }
);

interface SongSummary {
  tags?: string[];
  publicTags?: string[];
}

type TagsAction =
  | { type: 'INIT_TAGS'; payload: string[] }
  | { type: 'ADD_TAG'; payload: string }
  | { type: 'REMOVE_TAG'; payload: number }
  | { type: 'SET_TAGS'; payload: string[] };

function tagsReducer(state: string[], action: TagsAction): string[] {
  switch (action.type) {
    case 'INIT_TAGS':
      return action.payload;
    case 'ADD_TAG':
      return state.includes(action.payload) ? state : [...state, action.payload];
    case 'REMOVE_TAG': {
      const newTags = [...state];
      newTags.splice(action.payload, 1);
      return newTags;
    }
    case 'SET_TAGS':
      return action.payload;
    default:
      return state;
  }
}

const TagManageWindow = forwardRef<HTMLDivElement, TagManageWindowProps>(
  function TagManageWindow({ onClose, songid }, ref) {
    const { t } = useTranslation();
    const [newTag, setNewTag] = useState('');
    const [activeCategory, setActiveCategory] = useState('曲库来源');
    const [tags, dispatch] = useReducer(tagsReducer, []);
    const isInPrivatePage = window.location.pathname === '/user/charts';
    const initializedRef = useRef(false);
    /** Tags as last read from or saved to the server: the base of the public-tag PATCH diff. */
    const serverTagsRef = useRef<string[]>([]);
    const [saving, setSaving] = useState(false);

    const fetcher = (url: string) =>
      fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

    const { data, error, isLoading, mutate } = useSWR<SongSummary>(
      endpoints.maichart.summary(songid),
      fetcher
    );

    useEffect(() => {
      if (data && !initializedRef.current) {
        if (isInPrivatePage) {
          if (data.tags !== undefined) {
            serverTagsRef.current = data.tags;
            dispatch({ type: 'INIT_TAGS', payload: data.tags });
            initializedRef.current = true;
          } else {
            toast.error('没有Tags字段');
          }
        } else {
          if (data.publicTags !== undefined) {
            serverTagsRef.current = data.publicTags;
            dispatch({ type: 'INIT_TAGS', payload: data.publicTags });
            initializedRef.current = true;
          } else {
            toast.error('没有publicTags字段');
          }
        }
      }
    }, [data, isInPrivatePage]);

    const uploadTags = async () => {
      setSaving(true);
      const uploading = toast.loading(t("shared/TagManageWidget.Uploading"), {
        hideProgressBar: true,
      });
      let saved: string[];
      try {
        saved = await saveChartTags(songid, isInPrivatePage ? 'private' : 'public', serverTagsRef.current, tags);
      } catch (error) {
        if (error instanceof ApiError && error.code === CODE_TOO_MANY_ELEMENTS) {
          toast.error(t("shared/TagManageWidget.TooManyTags", { max: MAX_CHART_TAGS }));
        } else if (error instanceof ApiError && error.status === 409) {
          toast.error(t("shared/TagManageWidget.TagsChanged"));
        } else {
          toast.error('好像上传失败惹……');
        }
        return;
      } finally {
        toast.done(uploading);
        setSaving(false);
      }

      // The server normalizes tags and PATCH merges other players' edits, so show what it now holds.
      serverTagsRef.current = saved;
      dispatch({ type: 'SET_TAGS', payload: saved });
      await mutate((summary) => summary && { ...summary, [isInPrivatePage ? 'tags' : 'publicTags']: saved }, { revalidate: false });
      toast.success('上传成功了喵');
      //TODO: 刷新页面，重载数据，应该可以热重载，之后研究
      if (window.location.pathname !== '/user/charts') {
        await sleep(1000);
        window.location.reload();
      }
    };

    /** Adds a tag unless it is already there; refuses one past the backend's per-kind limit. */
    const addTag = (tag: string) => {
      if (tags.includes(tag)) return true;
      if (tags.length >= MAX_CHART_TAGS) {
        toast.error(t("shared/TagManageWidget.TooManyTags", { max: MAX_CHART_TAGS }));
        return false;
      }
      dispatch({ type: 'ADD_TAG', payload: tag });
      return true;
    };

    const categories: Record<string, string[]> = {
      曲库来源: [
        'POPS',
        'BMS',
        'SEGA',
        'BEMANI',
        'Anime',
        'VOCALOID',
        'Vtuber',
        'Touhou',
        'OTOGE',
        'Game',
        'IDOL',
      ],
      赛事: ['MMFC', 'KOM', '点子王', 'xmmcg', '拯救'],
      语种: ['Chinese', 'Japanese', 'Korean', 'Western', 'WorldMusic'],
      谱面要素: [
        '初代',
        'STD',
        'DX',
        'Fes',
        '变启动',
        '非常规要素',
        'BPM减半',
        'BPM加倍',
      ],
      谱面难度: ['变速', '耐力', '爆发', '技巧', '星星', '键盘', '面条', 'Touch', '发狂'],
      歌曲长度: ['FULL', '>5min', '<2min'],
      Neta类: ['观赏用', '舞蹈', 'PV演出', '音频还原', '官Re', '练习用'],
      其他: [
        'R-18G',
        '脚图',
        '类早餐蛋',
        '送给我孩子的歌',
        '⚠️大象出现！',
        '伪猫',
        '小笼包',
        '自慰',
        'Easy Lv.1',
        '梗要素大量发生',
        '#dydy',
        '下饭',
        '地雷note',
        'xxlbiloveu',
      ],
    };

    const changed = tags.length !== serverTagsRef.current.length || tags.some((tag, index) => tag !== serverTagsRef.current[index]);
    const submitNewTag = () => {
      const trimmed = newTag.trim();
      if (trimmed !== '' && addTag(trimmed)) setNewTag('');
    };
    const sectionLabel = 'mb-2 font-medium text-white/50 text-xs';

    let body: React.ReactNode;
    if (isLoading) {
      body = <div className="flex justify-center items-center py-16"><LoadingSpinner size="40px" /></div>;
    } else if (error || data === undefined) {
      body = <p className="m-0 py-16 text-white/50! text-sm text-center">{t("shared/TagManageWidget.LoadFailed")}</p>;
    } else {
      body = (
        <div className="flex flex-col gap-5 px-5 py-4 min-h-0 overflow-y-auto">
          {/* 已有标签：点一下移除 */}
          <section>
            <div className={sectionLabel}>{t("shared/TagManageWidget.CurrentTags")}</div>
            <div className="flex flex-wrap gap-1.5" data-testid="tag-current">
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <button
                    key={tag}
                    type="button"
                    data-tag={tag}
                    title={t("shared/TagManageWidget.DeleteTag")}
                    aria-label={t("shared/TagManageWidget.DeleteTag") + ' ' + tag}
                    onClick={() => dispatch({ type: 'REMOVE_TAG', payload: index })}
                    className={`group inline-flex items-center gap-1 pr-1.5 pl-2.5 border rounded-full h-7 text-xs transition-colors cursor-pointer ${isInPrivatePage ? 'bg-white/[0.08] border-white/15 text-white/85 hover:border-red-400/50 hover:text-red-200' : 'bg-blue-400/10 border-blue-400/30 text-blue-100 hover:border-red-400/50 hover:text-red-200'}`}
                  >
                    {tag}
                    <LuX aria-hidden="true" className="opacity-60 group-hover:opacity-100 w-3.5 h-3.5" />
                  </button>
                ))
              ) : (
                <span className="text-white/40 text-sm">{t("shared/TagManageWidget.NoTags")}</span>
              )}
            </div>
          </section>

          {/* 自定义标签 */}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitNewTag();
            }}
          >
            <input
              type="text"
              placeholder={t("shared/TagManageWidget.CustomTag")}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="flex-1 bg-white/[0.04] focus:bg-white/[0.06] px-3 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 min-w-0 h-10 text-white placeholder:text-white/35 text-sm transition-colors"
            />
            <button type="submit" className="bg-white/[0.06] hover:bg-white/10 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/90 text-sm transition-colors cursor-pointer shrink-0">
              {t("shared/TagManageWidget.AddTag")}
            </button>
          </form>

          {/* 常用标签：按类别切换，点一下加入 */}
          <section>
            <div className={sectionLabel}>{t("shared/TagManageWidget.CommonTags")}</div>
            <div className="flex flex-wrap gap-1 mb-3" role="tablist">
              {Object.keys(categories).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 rounded-lg h-8 text-xs font-medium transition-colors cursor-pointer ${activeCategory === cat ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories[activeCategory]
                .filter((tag) => !tags.includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="inline-flex items-center gap-1 bg-white/[0.03] hover:bg-white/[0.08] pr-2.5 pl-1.5 border border-white/10 hover:border-white/25 border-dashed rounded-full h-7 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    <LuPlus aria-hidden="true" className="w-3.5 h-3.5 text-white/40" />
                    {tag}
                  </button>
                ))}
            </div>
          </section>
        </div>
      );
    }

    return (
      // 外框（遮罩、动画、Esc）由 TagManageWidget 里的 Modal 提供
      <div ref={ref} className="flex flex-col min-h-0" onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center gap-3 px-5 pt-5 pb-3 border-white/[0.07] border-b">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 id="tag-manage-title" className="m-0 font-semibold text-white! text-lg! text-left!">
              {isInPrivatePage ? t("shared/TagManageWidget.AuthorTags") : t("shared/TagManageWidget.PlayerTags")}
            </h2>
            {data !== undefined && <span className="text-white/40 text-xs tabular-nums">{tags.length}/{MAX_CHART_TAGS}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("shared/TagManageWidget.Cancel")}
            className="place-items-center grid hover:bg-white/10 rounded-full w-8 h-8 text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <LuX aria-hidden="true" className="w-4 h-4" />
          </button>
        </header>

        {body}

        <footer className="flex justify-end gap-2 px-5 py-3 border-white/[0.07] border-t">
          <button type="button" onClick={onClose} className="bg-white/[0.06] hover:bg-white/10 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/85 text-sm transition-colors cursor-pointer">
            {t("shared/TagManageWidget.Cancel")}
          </button>
          <button
            type="button"
            onClick={uploadTags}
            disabled={!changed || saving || data === undefined}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 px-5 border-none rounded-xl h-10 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {t("shared/TagManageWidget.Save")}
          </button>
        </footer>
      </div>
    );
  }
);
