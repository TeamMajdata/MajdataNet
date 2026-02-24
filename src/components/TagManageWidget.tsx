/**
 * TagManageWidget 组件 - Tag管理小部件
 * 迁移自 legacy/src/app/widgets/TagManageWidget.jsx
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import Tooltip from '@/components/Tooltip';
import useSWR from 'swr';
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import { useLoc } from '@/hooks';
import sleep from '@/utils/sleep';
import { motion } from 'framer-motion';
import type {
  TagManageWidgetProps,
  TagManageWidgetRef,
  TagManageTagLauncherProps,
  TagManageButtonProps,
  TagManageTagProps,
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
        {isWindowOpen &&
          typeof window !== 'undefined' &&
          createPortal(
            <TagManageWindow
              ref={windowRef}
              onClose={() => setIsWindowOpen(false)}
              buttonRef={buttonRef}
              songid={songid}
            />,
            document.body
          )}
      </motion.div>
    );
  }
);

export default TagManageWidget;

export function TagManageTagLauncher({ onClick }: TagManageTagLauncherProps) {
  return <TagManageTag onClick={onClick} />;
}

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

const TagManageTag = forwardRef<HTMLButtonElement, TagManageTagProps>(
  function TagManageTag({ onClick }, ref) {
    return (
      <motion.button
        ref={ref}
        onMouseDown={onClick}
        className="bg-green-600 hover:bg-green-500 px-2.5 py-0.75 rounded-xl text-white text-xs transition-colors duration-200 cursor-pointer"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <svg
          className="fill-white stroke-white w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          height="16"
          viewBox="0 -960 960 960"
          width="16"
        >
          <path d="M480-160v-80h120l180-240-180-240H160v200H80v-200q0-33 23.5-56.5T160-800h440q19 0 36 8.5t28 23.5l216 288-216 288q-11 15-28 23.5t-36 8.5H480Zm-10-320ZM200-120v-120H80v-80h120v-120h80v120h120v80H280v120h-80Z" />
        </svg>
      </motion.button>
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
      return [...state, action.payload];
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
  function TagManageWindow({ onClose, buttonRef, songid }, ref) {
    const loc = useLoc();
    const [position, setPosition] = useState({
      x: window.innerWidth / 2 - 200,
      y: 100,
    });
    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [newTag, setNewTag] = useState('');
    const [activeCategory, setActiveCategory] = useState('曲库来源');
    const [tags, dispatch] = useReducer(tagsReducer, []);
    const isInPrivatePage = window.location.pathname === '/user/charts';
    const initializedRef = useRef(false);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        // 如果正在拖拽，不处理点击关闭
        if (dragging) {
          return;
        }

        // 检查点击是否在弹窗外部且不在触发按钮上
        if (
          ref &&
          typeof ref !== 'function' &&
          ref.current &&
          !ref.current.contains(e.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(e.target as Node)
        ) {
          onClose();
        }
      };

      // 使用捕获阶段来确保在事件冒泡之前处理
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [onClose, ref, buttonRef, dragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
      setDragging(true);
      if (ref && typeof ref !== 'function' && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (dragging) {
          setPosition({
            x: e.clientX - offset.x,
            y: e.clientY - offset.y,
          });
        }
      };

      const handleMouseUp = () => setDragging(false);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [dragging, offset]);

    const fetcher = (url: string) =>
      fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

    const { data, error, isLoading } = useSWR<SongSummary>(
      apiroot3 + '/maichart/' + songid + '/summary',
      fetcher
    );

    useEffect(() => {
      if (data && !initializedRef.current) {
        if (isInPrivatePage) {
          if (data.tags !== undefined) {
            dispatch({ type: 'INIT_TAGS', payload: data.tags });
            initializedRef.current = true;
          } else {
            toast.error('没有Tags字段');
          }
        } else {
          if (data.publicTags !== undefined) {
            dispatch({ type: 'INIT_TAGS', payload: data.publicTags });
            initializedRef.current = true;
          } else {
            toast.error('没有publicTags字段');
          }
        }
      }
    }, [data, isInPrivatePage]);

    const uploadTags = async () => {
      const uploading = toast.loading(loc('Uploading'), {
        hideProgressBar: true,
      });
      const response = await fetch(
        apiroot3 + '/maichart/' + songid + (isInPrivatePage ? '/tags' : '/publictags'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tags),
          credentials: 'include',
        }
      );
      toast.done(uploading);

      if (!response.ok) {
        toast.error('好像上传失败惹……');
      } else {
        //TODO: 刷新页面，重载数据，应该可以热重载，之后研究
        toast.success('上传成功了喵');
        if (window.location.pathname !== '/user/charts') {
          await sleep(1000);
          window.location.reload();
        }
      }

      return response;
    };

    if (error) {
      return <div>failed to load</div>;
    }
    if (isLoading) {
      return <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-12.5 h-12.5 animate-[spin_0.1s_linear_infinite]"></div>;
    }
    if (data === undefined) {
      return <div>failed to load</div>;
    }

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

    return (
      <div
        ref={ref}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(var(--background-start), 0.8)',
          backdropFilter: 'blur(10px)',
          position: 'fixed',
          left: position.x + 'px',
          top: position.y + 'px',
          width: '400px',
          minHeight: '300px',
          textShadow: '0 0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1001,
          cursor: dragging ? 'grabbing' : 'default',
          border: '1px solid whitesmoke',
          fontSize: '1rem',
        }}
      >
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e);
          }}
          style={{
            padding: '16px',
            borderBottom: '1px solid #eee',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          {isInPrivatePage ? '作者Tags管理' : '玩家Tags管理'}
        </div>
        <div style={{ padding: '16px' }}>
          <div className="flex flex-wrap items-center gap-1.5 my-1">
            <div className="min-w-12 font-semibold text-white text-sm">Tags:</div>
            <div className="flex flex-wrap flex-1 gap-1.5 mt-1 text-white/70 text-sm text-left break-words">
              {tags && tags.length > 0 ? (
                tags.map((tag, index) => (
                  <Tooltip content={loc('DeleteTag')} key={index}>
                    <span
                      className={isInPrivatePage ? 'bg-gray-100 hover:bg-gray-300 px-2.5 py-[3px] rounded-xl text-[#333] text-xs cursor-pointer transition-colors duration-200' : 'bg-blue-100 hover:bg-blue-200 px-2.5 py-[3px] rounded-xl text-blue-800 text-xs cursor-pointer transition-colors duration-200'}
                      onClick={() => {
                        dispatch({ type: 'REMOVE_TAG', payload: index });
                      }}
                    >
                      {tag}
                    </span>
                  </Tooltip>
                ))
              ) : (
                <span style={{ color: '#999', fontStyle: 'italic' }}>{loc('NoTags')}</span>
              )}
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={loc('CustomTag')}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              style={{
                marginLeft: '4px',
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            />
            <button
              onClick={() => {
                const trimmed = newTag.trim();
                if (trimmed !== '') {
                  dispatch({ type: 'ADD_TAG', payload: trimmed });
                  setNewTag(''); // 清空输入框
                }
              }}
              style={{ padding: '6px 12px' }}
            >
              {loc('AddTag')}
            </button>
          </div>
          <p>{loc('CommonTags')}</p>
          {/* tab bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            {Object.keys(categories).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: activeCategory === cat ? '1px solid #007bff' : '1px solid #ccc',
                  backgroundColor: activeCategory === cat ? 'black' : 'black',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div
            className="flex flex-wrap gap-2 mt-1"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
          >
            {categories[activeCategory]
              .filter((tag) => !tags.includes(tag))
              .map((tag) => (
                <span
                  className="bg-gray-100 hover:bg-gray-300 px-2.5 py-[3px] rounded-xl text-[#333] text-xs transition-colors duration-200 cursor-pointer"
                  key={tag}
                  onClick={() => {
                    dispatch({ type: 'ADD_TAG', payload: tag });
                  }}
                >
                  {tag}
                </span>
              ))}
          </div>
          <br />
          <div className="relative bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/20%)*15%,rgb(255_255_255*/_40%)*30%,rgb(255_255_255*/_60%)*50%,rgb(255_255_255*/_40%)*70%,rgb(255_255_255*/_20%)_85%,transparent_100%)] mx-auto my-8 max-[480px]:my-5 max-[768px]:my-6 border-0 w-[70%] max-[480px]:w-[90%] max-[768px]:w-[80%] h-[1px]" />
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '12px',
            }}
          >
            <button
              style={{
                padding: '6px 12px',
                border: '1px solid whitesmoke',
                borderRadius: '5px',
              }}
              onClick={uploadTags}
            >
              更新Tags
            </button>
          </div>
        </div>
      </div>
    );
  }
);
