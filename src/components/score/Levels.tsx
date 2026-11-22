import { useLayoutEffect, useRef, useState } from 'react';
import type { LevelsProps } from '@/types';
import { Link } from 'react-router-dom';
import { LEVEL_BG_CLASS as levelColors } from './levelColors';


// 只有一个难度时显示的完整名称
const levelNames = ['Easy', 'Basic', 'Advanced', 'Expert', 'Master', 'Re:Master', 'Utage'];

/** 标签之间的间距（gap-1） */
const GAP_PX = 4;

const BADGE_CLASS = 'inline-flex items-center gap-1 px-1.5 rounded-md min-w-5.5 h-5 font-bold text-[0.7rem] text-white leading-none whitespace-nowrap justify-center shrink-0 shadow-[0_0_0_1px_rgb(255_255_255/12%)_inset] select-none no-underline';
const LINK_CLASS = 'hover:brightness-125 transition-[filter] cursor-pointer';

/**
 * 多难度等级列表组件
 * 标签宽度随文字变化；只有一个难度时显示“难度名 + 等级”。
 *
 * 永远只占一行：难度多到放不下时（例如 6、7 个难度加上很长的宴谱等级），从最低的难度开始收进最前面的“+N”，
 * 卡片高度是固定的，换行会把标题、曲师挤没。Master / Re:Master / 宴这些更常看的难度留在外面；
 * “+N”悬停显示被收起的难度，能跳转时点它进谱面页。
 */
export default function Levels({ levels, songid, linkToSong = false }: LevelsProps) {
  // 难度顺序：0=Easy, 1=Basic, 2=Advanced, 3=Expert, 4=Master, 5=ReMaster, 6=Utage
  const available = levels
    .map((level, index) => ({ level, index }))
    .filter((item): item is { level: string; index: number } => item.level != null && item.level !== '');
  const single = available.length === 1;

  const rowRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLElement>(null);
  const badgeRefs = useRef<(HTMLElement | null)[]>([]);
  // 每个标签的宽度：第一次全部显示时量好记下（之后被藏起来的量不到）
  const widthsRef = useRef<number[] | null>(null);
  // 从第几个标签开始显示，前面的收进“+N”
  const [hiddenCount, setHiddenCount] = useState(0);
  const key = available.map(({ level, index }) => index + ':' + level).join('|');

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    widthsRef.current = null;
    setHiddenCount(0);
    const fit = () => {
      if (!widthsRef.current) {
        // 刚换了一组难度：等全部显示的那一帧量宽度
        if (badgeRefs.current.slice(0, available.length).some((badge) => !badge || badge.hidden)) return;
        widthsRef.current = badgeRefs.current.slice(0, available.length).map((badge) => badge!.offsetWidth);
      }
      const widths = widthsRef.current;
      const room = row.clientWidth;
      const moreWidth = (moreRef.current?.offsetWidth || 26) + GAP_PX;
      // 全部放得下就都显示
      const total = widths.reduce((sum, width) => sum + width, 0) + GAP_PX * Math.max(0, widths.length - 1);
      if (total <= room) {
        setHiddenCount(0);
        return;
      }
      // 从最高的难度往前放，放不下的部分（加上“+N”）收起来；至少留一个
      let used = 0;
      let first = widths.length;
      for (let i = widths.length - 1; i >= 0; i--) {
        const next = used + widths[i] + (used ? GAP_PX : 0);
        const needsMore = i > 0;
        if (next + (needsMore ? moreWidth : 0) > room && first < widths.length) break;
        used = next;
        first = i;
      }
      setHiddenCount(first);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
    // 只在这组难度变化时重新测量；available 每次渲染都是新数组，用 key 判断
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const hidden = available.slice(0, hiddenCount);
  const hiddenLabel = hidden.map(({ level, index }) => `${levelNames[index]} ${level}`).join(' · ');
  const songLink = `/song?id=${songid}`;

  return (
    <div ref={rowRef} className="flex gap-1 min-w-0 overflow-hidden">
      {hidden.length > 0 && (linkToSong ? (
        <Link ref={(element) => { moreRef.current = element; }} to={songLink} title={hiddenLabel} aria-label={hiddenLabel}
          className={`${BADGE_CLASS} ${LINK_CLASS} bg-white/12 text-white/80!`}>
          +{hidden.length}
        </Link>
      ) : (
        <span ref={(element) => { moreRef.current = element; }} title={hiddenLabel} aria-label={hiddenLabel} className={`${BADGE_CLASS} bg-white/12 text-white/80!`}>
          +{hidden.length}
        </span>
      ))}
      {available.map(({ level, index }, i) => {
        const className = `${BADGE_CLASS} ${linkToSong ? LINK_CLASS : ''} ${levelColors[index] || ''}`;
        const content = <>
          {single && <span className="font-semibold">{levelNames[index]}</span>}
          <span>{level}</span>
        </>;
        const ref = (element: HTMLElement | null) => { badgeRefs.current[i] = element; };
        return linkToSong ? (
          <Link key={index} ref={ref} hidden={i < hiddenCount} to={`${songLink}&level=${index}`} className={className}>{content}</Link>
        ) : (
          <span key={index} ref={ref} hidden={i < hiddenCount} className={className}>{content}</span>
        );
      })}
    </div>
  );
}
