/**
 * SongComments - Reddit 式评论区：线程、投票、排序、永久链接、编辑与删除。
 * 结构与 OurTaiko Fanmade 的 comments.tsx 一致，接的是 mmfcapi 的 CommentController。
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  PiArrowBendUpLeftBold,
  PiArrowRightBold,
  PiChatCircleBold,
  PiLinkSimpleBold,
  PiMinusBold,
  PiPencilSimpleBold,
  PiPlusBold,
  PiShieldWarningBold,
  PiTrashBold,
} from 'react-icons/pi';
import { endpoints } from '@/config/api';
import { LoadingSpinner } from '@/components';
import { useI18n, useIsAdministrator, useUserContext } from '@/hooks';
import { apiRequest, jsonRequest } from '@/utils/apiClient';
import { VoteControl } from './VoteControl';
import { intlLocale, loginPath } from '@/utils/interaction';
import { commentPermalink, mapTree, purge, toPlaceholder } from './commentTree';
import { COMMENT_SORTS } from '@/types';
import type {
  Comment,
  CommentDeletion,
  CommentList,
  CommentPage,
  CommentSort,
  CommentThread,
  Vote,
  VoteResult,
} from '@/types';

const MAX_COMMENT_LENGTH = 10000;
// 更深的回复在评论自己的页面继续，和 Reddit 一样
const MAX_VISIBLE_DEPTH = 8;
// 分数不高于这个值的评论默认折叠
const COLLAPSE_SCORE = -5;

const glassButton =
  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50';
const primaryButton =
  'rounded-lg border border-blue-500/30 bg-linear-to-br from-blue-500/20 to-blue-600/30 px-4 py-1.5 text-sm font-medium text-white/90 transition-all hover:from-blue-500/30 hover:to-blue-600/40 disabled:cursor-not-allowed disabled:opacity-50';
const ghostButton =
  'rounded-lg border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50';

export function RelativeTime({ value }: { value: string }) {
  const { language } = useI18n();
  // 以首次渲染时刻为准；相对时间不需要逐秒刷新
  const [now] = useState(() => Date.now());
  const date = new Date(value);
  const locale = intlLocale(language);
  const seconds = Math.round((date.getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) ?? ['second', 1];
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const text = unit === 'second' ? formatter.format(0, 'second') : formatter.format(Math.trunc(seconds / size), unit);
  return (
    <time dateTime={value} title={date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}>
      {text}
    </time>
  );
}

const LINK_OR_MENTION = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]}，。！？）】]|@[a-zA-Z0-9_-]{1,24})/g;

/** 纯文本正文：只识别网址和 @用户名，不解析 Markdown 或 HTML。 */
export function CommentBody({ text }: { text: string }) {
  const parts = text.split(LINK_OR_MENTION);
  return (
    <p className="max-w-[70ch] text-white/90 text-sm leading-6 whitespace-pre-wrap wrap-anywhere">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith('@')) {
          return (
            <Link key={i} to={`/space?id=${encodeURIComponent(part.slice(1))}`} className="font-medium text-sky-400 hover:underline">
              {part}
            </Link>
          );
        }
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-sky-400 hover:underline">
            {part}
          </a>
        );
      })}
    </p>
  );
}

function Composer({
  initial = '',
  placeholder,
  submitLabel,
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { i18n } = useI18n();
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const length = Array.from(body.trim()).length;
  const submit = async () => {
    if (busy || length === 0 || length > MAX_COMMENT_LENGTH) return;
    setBusy(true);
    try {
      await onSubmit(body);
      setBody('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <textarea
        value={body}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={MAX_COMMENT_LENGTH + 200}
        disabled={busy}
        className="bg-white/6 focus:bg-white/8 px-4 py-3 border border-white/15 focus:border-blue-400/40 rounded-xl focus:outline-none w-full min-h-24 text-white text-sm leading-relaxed resize-y"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
          if (e.key === 'Escape' && onCancel) onCancel();
        }}
      />
      <div className="flex flex-wrap justify-end items-center gap-2">
        {length > MAX_COMMENT_LENGTH * 0.9 && (
          <span className={`mr-auto text-xs tabular-nums ${length > MAX_COMMENT_LENGTH ? 'text-red-400' : 'text-white/50'}`}>
            {length} / {MAX_COMMENT_LENGTH}
          </span>
        )}
        {onCancel && (
          <button type="button" className={ghostButton} disabled={busy} onClick={onCancel}>
            {i18n("song/SongComments.Cancel", '取消')}
          </button>
        )}
        <button type="submit" className={primaryButton} disabled={busy || length === 0 || length > MAX_COMMENT_LENGTH}>
          {busy ? i18n("song/SongComments.Posting", '发送中…') : submitLabel}
        </button>
      </div>
    </form>
  );
}

interface Tree {
  chartId: string;
  uploader: string;
  focusId?: string;
  update: (id: string, change: (comment: Comment) => Comment) => void;
  addReply: (parentId: string, reply: Comment) => void;
  remove: (id: string, purged: boolean, removed: boolean) => void;
}
const TreeContext = createContext<Tree | null>(null);

function Avatar({ username, className }: { username: string; className: string }) {
  return <img className={`${className} rounded-full object-cover border border-white/20`} src={endpoints.account.icon(username)} alt={username} />;
}

function CommentNode({ comment, level }: { comment: Comment; level: number }) {
  const { i18n } = useI18n();
  const tree = useContext(TreeContext)!;
  const { user, username } = useUserContext();
  const isAdministrator = useIsAdministrator();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(comment.score <= COLLAPSE_SCORE);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const gone = comment.deleted || comment.removed;
  const own = !!user && !gone && (comment.authorId === user.id || comment.author === username);
  const canModerate = isAdministrator && !own && !gone;
  const focused = tree.focusId === comment.id;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focused) return;
    // 页面上方的内容后加载会把评论推下去；在布局稳定前把被链接的评论留在视野里，读者一滚动就停
    const keep = () => ref.current?.scrollIntoView({ block: 'center' });
    keep();
    const observer = new ResizeObserver(keep);
    observer.observe(document.documentElement);
    const stop = () => observer.disconnect();
    const timer = window.setTimeout(stop, 4000);
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    events.forEach((e) => window.addEventListener(e, stop, { once: true, passive: true }));
    return () => {
      stop();
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [focused]);
  const permalink = commentPermalink(tree.chartId, comment.id);
  const author = gone ? '' : comment.author || i18n("song/SongComments.UnknownUser", '未知用户');
  const hiddenReplies = comment.replyCount - comment.replies.length;
  const remove = async () => {
    setBusy(true);
    try {
      const result = await apiRequest<CommentDeletion>(endpoints.comment.item(comment.id), jsonRequest('DELETE'));
      setConfirming(false);
      tree.remove(comment.id, result.purged, canModerate);
      toast.success(canModerate ? i18n("song/SongComments.Removed", '已移除') : i18n("song/SongComments.Deleted", '已删除'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    const url = new URL(permalink, window.location.origin).href;
    navigator.clipboard?.writeText(url).then(
      () => toast.success(i18n("song/SongComments.LinkCopied", '链接已复制')),
      () => toast.info(url),
    );
  };

  return (
    <article ref={ref} id={`comment-${comment.id}`} className="min-w-0 scroll-mt-24">
      <div className="flex gap-2">
        <div className="flex flex-col items-center shrink-0">
          {gone ? (
            <span className="bg-white/10 rounded-full w-6 h-6" aria-hidden="true" />
          ) : (
            <Link to={`/space?id=${encodeURIComponent(comment.author)}`} tabIndex={-1} aria-hidden="true">
              <Avatar username={comment.author} className="w-6 h-6" />
            </Link>
          )}
          {!collapsed && comment.replies.length > 0 && (
            <button
              type="button"
              className="group flex flex-1 justify-center mt-1 w-4 outline-none"
              aria-label={i18n("song/SongComments.CollapseThread", '折叠')}
              onClick={() => setCollapsed(true)}
            >
              <span className="bg-white/15 group-hover:bg-sky-400 group-focus-visible:bg-sky-400 w-px transition-colors" />
            </button>
          )}
        </div>
        <div className="flex-1 pb-1 min-w-0">
          <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-h-6 text-white/50 text-xs">
            {gone ? (
              <span className="italic">{i18n("song/SongComments.DeletedAuthor", '[已删除]')}</span>
            ) : (
              <Link to={`/space?id=${encodeURIComponent(comment.author)}`} className="max-w-48 font-medium text-white/90 truncate hover:underline">
                {author}
              </Link>
            )}
            {!gone && comment.author === tree.uploader && (
              <span className="bg-sky-400/15 px-1.5 py-0.5 rounded-md font-medium text-sky-300" title={i18n("song/SongComments.UploaderBadgeTitle", '这张谱面的上传者')}>
                {i18n("song/SongComments.Uploader", '上传者')}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <Link to={permalink} className="hover:underline">
              <RelativeTime value={comment.createdAt} />
            </Link>
            {comment.editedAt && !gone && (
              <span title={new Date(comment.editedAt).toLocaleString()}>· {i18n("song/SongComments.Edited", '已编辑')}</span>
            )}
            <button
              type="button"
              className={glassButton}
              aria-expanded={!collapsed}
              aria-label={collapsed ? i18n("song/SongComments.ExpandThread", '展开') : i18n("song/SongComments.CollapseThread", '折叠')}
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? <PiPlusBold className="w-3 h-3" /> : <PiMinusBold className="w-3 h-3" />}
              {collapsed && comment.replyCount > 0 && (
                <span>{comment.replyCount} {i18n("song/SongComments.Replies", '条回复')}</span>
              )}
            </button>
          </header>
          {!collapsed && (
            <div className={`mt-1 space-y-1 ${focused ? '-mx-2 rounded-xl bg-sky-400/8 px-2 py-1 ring-1 ring-sky-400/30' : ''}`}>
              {editing ? (
                <Composer
                  initial={comment.body}
                  autoFocus
                  placeholder={i18n("song/SongComments.EditPlaceholder", '编辑评论')}
                  submitLabel={i18n("song/SongComments.Save", '保存')}
                  onCancel={() => setEditing(false)}
                  onSubmit={async (body) => {
                    const updated = await apiRequest<Comment>(endpoints.comment.item(comment.id), jsonRequest('PATCH', { body }));
                    tree.update(comment.id, (c) => ({ ...c, body: updated.body, editedAt: updated.editedAt }));
                    setEditing(false);
                  }}
                />
              ) : gone ? (
                <p className="text-white/50 text-sm italic">
                  {comment.removed ? i18n("song/SongComments.RemovedBody", '此评论已被管理员移除') : i18n("song/SongComments.DeletedBody", '此评论已被作者删除')}
                </p>
              ) : (
                <CommentBody text={comment.body} />
              )}
              <div className="flex flex-wrap items-center gap-1 -ml-1.5 text-xs">
                <VoteControl
                  score={comment.score}
                  myVote={comment.myVote}
                  label={i18n("song/SongComments.VoteOnComment", '给评论投票')}
                  disabled={gone && comment.myVote === 0}
                  onVote={(value: Vote) => apiRequest<VoteResult>(endpoints.comment.vote(comment.id), jsonRequest('PUT', { value }))}
                  onResult={(r) => tree.update(comment.id, (c) => ({ ...c, score: r.score, myVote: r.myVote }))}
                />
                {!gone &&
                  (user ? (
                    <button type="button" className={glassButton} aria-expanded={replying} onClick={() => setReplying((v) => !v)}>
                      <PiArrowBendUpLeftBold />
                      {i18n("song/SongComments.Reply", '回复')}
                    </button>
                  ) : (
                    <Link to={loginPath(location)} className={glassButton}>
                      <PiArrowBendUpLeftBold />
                      {i18n("song/SongComments.Reply", '回复')}
                    </Link>
                  ))}
                <button type="button" className={glassButton} onClick={share}>
                  <PiLinkSimpleBold />
                  {i18n("song/SongComments.Share", '分享')}
                </button>
                {own && !editing && (
                  <button type="button" className={glassButton} onClick={() => setEditing(true)}>
                    <PiPencilSimpleBold />
                    {i18n("song/SongComments.Edit", '编辑')}
                  </button>
                )}
                {(own || canModerate) && !confirming && (
                  <button type="button" className={`${glassButton} text-red-400 hover:text-red-300`} onClick={() => setConfirming(true)}>
                    {canModerate ? <PiShieldWarningBold /> : <PiTrashBold />}
                    {canModerate ? i18n("song/SongComments.Remove", '移除') : i18n("song/SongComments.Delete", '删除')}
                  </button>
                )}
                {confirming && (
                  <span className="inline-flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                    <span className="text-red-200">
                      {canModerate ? i18n("song/SongComments.RemoveConfirm", '移除这条评论？') : i18n("song/SongComments.DeleteConfirm", '删除这条评论？')}
                    </span>
                    <button type="button" className={`${glassButton} text-red-300 hover:text-red-200`} disabled={busy} onClick={() => void remove()}>
                      {i18n("song/SongComments.ConfirmDelete", '确认')}
                    </button>
                    <button type="button" className={glassButton} disabled={busy} onClick={() => setConfirming(false)}>
                      {i18n("song/SongComments.Cancel", '取消')}
                    </button>
                  </span>
                )}
              </div>
              {replying && (
                <div className="pt-1">
                  <Composer
                    autoFocus
                    placeholder={`${i18n("song/SongComments.ReplyTo", '回复')} ${author}`}
                    submitLabel={i18n("song/SongComments.Reply", '回复')}
                    onCancel={() => setReplying(false)}
                    onSubmit={async (body) => {
                      const reply = await apiRequest<Comment>(
                        endpoints.maichart.newComment(tree.chartId),
                        jsonRequest('POST', { body, parentId: comment.id }),
                      );
                      tree.addReply(comment.id, reply);
                      setReplying(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {!collapsed &&
            (level >= MAX_VISIBLE_DEPTH && comment.replyCount > 0 ? (
              <Link to={permalink} className="inline-flex items-center gap-1 mt-2 text-sky-400 text-xs hover:underline">
                {i18n("song/SongComments.ContinueThread", '继续阅读这个话题')}
                <PiArrowRightBold className="w-3 h-3" />
              </Link>
            ) : (
              (comment.replies.length > 0 || hiddenReplies > 0) && (
                <div className="space-y-4 mt-3">
                  {comment.replies.map((reply) => (
                    <CommentNode key={reply.id} comment={reply} level={level + 1} />
                  ))}
                  {hiddenReplies > 0 && (
                    <Link to={permalink} className="inline-flex items-center gap-1 text-sky-400 text-xs hover:underline">
                      {hiddenReplies} {i18n("song/SongComments.MoreReplies", '条更多回复')}
                      <PiArrowRightBold className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )
            ))}
        </div>
      </div>
    </article>
  );
}

export interface CommentSectionProps {
  chartId: string;
  /** 上传者用户名，给其评论加标记。 */
  uploader: string;
  /** 互动记录里的存活评论数，用于标题；评论增减后在本地跟着变。 */
  commentCount: number;
  /** 只看这一条评论及其回复（永久链接）。 */
  focusId?: string;
}

export function CommentSection({ chartId, uploader, commentCount, focusId }: CommentSectionProps) {
  const { i18n } = useI18n();
  const { user } = useUserContext();
  const location = useLocation();
  const [sort, setSort] = useState<CommentSort>('best');
  const [attempt, setAttempt] = useState(0);
  // 加载结果带着它所属的请求键；条件一变旧结果自然失效，不必在 effect 里清空状态
  const requestKey = `${chartId}|${focusId ?? ''}|${sort}|${attempt}`;
  const [listing, setListing] = useState<{ key: string; items: Comment[]; total: number; page: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [countChange, setCountChange] = useState<{ key: string; delta: number }>({ key: requestKey, delta: 0 });
  const [loadedCount, setLoadedCount] = useState<{ key: string; count: number } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const section = useRef<HTMLElement>(null);
  const current = listing?.key === requestKey ? listing : null;
  const error = failure?.key === requestKey ? failure.message : '';
  const baseCount = loadedCount?.key === requestKey ? loadedCount.count : commentCount;
  const count = baseCount + (countChange.key === requestKey ? countChange.delta : 0);
  const changeCount = (delta: number) =>
    setCountChange((c) => (c.key === requestKey ? { key: requestKey, delta: c.delta + delta } : { key: requestKey, delta }));

  useEffect(() => {
    const controller = new AbortController();
    const request = focusId
      ? apiRequest<CommentThread>(endpoints.comment.thread(focusId, sort), { signal: controller.signal }).then((r) => ({
          items: [r.item],
          total: 1,
        }))
      : apiRequest<CommentPage>(endpoints.maichart.comments(chartId, sort, 1), { signal: controller.signal }).then((r) => {
          setLoadedCount({ key: requestKey, count: r.commentCount });
          return r;
        });
    request
      .then((r) => {
        if (controller.signal.aborted) return;
        setListing({ key: requestKey, items: r.items, total: r.total, page: 1 });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setFailure({ key: requestKey, message: (e as Error).message });
      });
    return () => controller.abort();
  }, [chartId, focusId, sort, requestKey]);
  useEffect(() => {
    if (location.hash === '#comments') section.current?.scrollIntoView();
  }, [location.hash]);

  const updateItems = (change: (items: Comment[]) => Comment[]) =>
    setListing((l) => (l && l.key === requestKey ? { ...l, items: change(l.items) } : l));

  const loadMore = async () => {
    if (!current) return;
    setLoadingMore(true);
    try {
      const next = await apiRequest<CommentPage>(endpoints.maichart.comments(chartId, sort, current.page + 1));
      // 期间新发的评论会让分页错位；已经显示的就跳过
      setListing((l) => {
        if (!l || l.key !== requestKey) return l;
        const seen = new Set(l.items.map((c) => c.id));
        return { ...l, items: [...l.items, ...next.items.filter((c) => !seen.has(c.id))], total: next.total, page: l.page + 1 };
      });
    } catch (e) {
      setFailure({ key: requestKey, message: (e as Error).message });
    } finally {
      setLoadingMore(false);
    }
  };

  const tree: Tree = {
    chartId,
    uploader,
    focusId,
    update: (id, change) => updateItems((items) => mapTree(items, id, change)),
    addReply: (parentId, reply) => {
      updateItems((items) => mapTree(items, parentId, (c) => ({ ...c, replyCount: c.replyCount + 1, replies: [reply, ...c.replies] })));
      changeCount(1);
    },
    remove: (id, purged, removed) => {
      changeCount(-1);
      if (!purged) {
        updateItems((items) => mapTree(items, id, (c) => toPlaceholder(c, removed)));
        return;
      }
      // 连带消失的占位符本来就不算存活评论，所以计数只减被删的这一条
      setListing((l) => {
        if (!l || l.key !== requestKey) return l;
        const items = purge(l.items, id);
        return { ...l, items, total: l.total - (l.items.length - items.length) };
      });
    },
  };

  const sortLabels: Record<CommentSort, string> = {
    best: i18n("song/SongComments.SortBest", '最佳'),
    top: i18n("song/SongComments.SortTop", '最高分'),
    new: i18n("song/SongComments.SortNew", '最新'),
    old: i18n("song/SongComments.SortOld", '最早'),
    controversial: i18n("song/SongComments.SortControversial", '争议'),
  };

  return (
    <section
      ref={section}
      id="comments"
      aria-labelledby="comments-heading"
      className="space-y-6 mx-auto my-6 sm:my-8 p-4 sm:p-6 md:p-8 border border-white/10 rounded-2xl w-full md:w-[82%] lg:w-[70%] scroll-mt-24"
      style={{
        background: 'linear-gradient(135deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 5%))',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 25px rgb(0 0 0 / 30%), 0 4px 12px rgb(0 0 0 / 20%)',
      }}
    >
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 id="comments-heading" className="flex items-center gap-2 m-0 font-semibold text-white text-xl whitespace-nowrap shrink-0" style={{ textShadow: '0 2px 4px rgb(0 0 0 / 30%)' }}>
          <PiChatCircleBold aria-hidden="true" />
          {i18n("song/SongComments.Comments", '评论')}
          <span className="font-normal text-white/60 text-base tabular-nums">{count}</span>
        </h2>
        <label className="flex items-center gap-2 text-white/60 text-sm shrink-0">
          <span>{i18n("song/SongComments.SortBy", '排序')}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CommentSort)}
            className="bg-[rgba(20,20,25,0.8)] px-3 py-1 border border-white/20 rounded-full outline-none text-white text-sm cursor-pointer"
          >
            {COMMENT_SORTS.map((value) => (
              <option key={value} value={value}>
                {sortLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {focusId ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white/6 px-4 py-3 rounded-xl text-sm">
          <span className="text-white/60">{i18n("song/SongComments.SingleThread", '正在查看单条评论')}</span>
          <Link to={`/song?id=${encodeURIComponent(chartId)}#comments`} className="text-sky-400 hover:underline">
            {i18n("song/SongComments.ViewAll", '查看全部评论')}
          </Link>
          {current?.items[0]?.parentId && (
            <Link to={commentPermalink(chartId, current.items[0].parentId)} className="text-sky-400 hover:underline">
              {i18n("song/SongComments.ViewParent", '查看上一级')}
            </Link>
          )}
        </div>
      ) : user ? (
        <Composer
          placeholder={i18n("song/SongComments.CommentPlaceholder", '分享你对这张谱面的想法…')}
          submitLabel={i18n("song/SongComments.Post", '发表')}
          onSubmit={async (body) => {
            const created = await apiRequest<Comment>(endpoints.maichart.newComment(chartId), jsonRequest('POST', { body }));
            setListing((l) => (l && l.key === requestKey ? { ...l, items: [created, ...l.items], total: l.total + 1 } : l));
            changeCount(1);
          }}
        />
      ) : (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-white/6 px-4 py-3 rounded-xl text-sm">
          <span className="text-white/60">{i18n("song/SongComments.SignInToComment", '登录后即可评论')}</span>
          <Link to={loginPath(location)} className={primaryButton}>
            {i18n("song/SongComments.SignIn", '登录')}
          </Link>
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-red-300 text-sm">{error}</p>
          <button type="button" className={ghostButton} onClick={() => setAttempt((n) => n + 1)}>
            {i18n("song/SongComments.Retry", '重试')}
          </button>
        </div>
      ) : !current ? (
        <div className="flex justify-center py-8" role="status" aria-label={i18n("song/SongComments.Loading", '加载中')}>
          <LoadingSpinner size={32} />
        </div>
      ) : current.items.length === 0 ? (
        <p className="py-8 text-white/50 text-sm text-center">{i18n("song/SongComments.NoComments", '暂无评论')}</p>
      ) : (
        <TreeContext.Provider value={tree}>
          <div className="space-y-6">
            {current.items.map((comment) => (
              <CommentNode key={comment.id} comment={comment} level={0} />
            ))}
          </div>
        </TreeContext.Provider>
      )}
      {!focusId && current && current.items.length < current.total && (
        <div className="flex justify-center">
          <button type="button" className={ghostButton} disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? i18n("song/SongComments.Loading", '加载中') : i18n("song/SongComments.LoadMore", '加载更多')}
          </button>
        </div>
      )}
    </section>
  );
}

/** 用户评论历史里的一条：平铺，带所在谱面。 */
function CommentSummary({ comment }: { comment: Comment }) {
  const { i18n } = useI18n();
  return (
    <article className="space-y-2 bg-white/6 p-4 border border-white/10 rounded-xl min-w-0">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-white/50 text-xs">
        <Link to={`/space?id=${encodeURIComponent(comment.author)}`} className="inline-flex items-center gap-1.5 font-medium text-white/90 hover:underline">
          <Avatar username={comment.author} className="w-5 h-5" />
          {comment.author || i18n("song/SongComments.UnknownUser", '未知用户')}
        </Link>
        <span aria-hidden="true">·</span>
        {comment.chartId ? (
          <Link to={`/song?id=${encodeURIComponent(comment.chartId)}`} className="max-w-60 truncate hover:underline">
            {comment.chartTitle ?? comment.chartHash}
          </Link>
        ) : (
          <span className="max-w-60 truncate">{comment.chartTitle ?? i18n("song/SongComments.DeletedChart", '谱面已删除')}</span>
        )}
        <span aria-hidden="true">·</span>
        <RelativeTime value={comment.createdAt} />
      </header>
      <CommentBody text={comment.body} />
      <footer className="flex flex-wrap items-center gap-3 text-white/50 text-xs">
        <span className="tabular-nums">{comment.score} {i18n("song/SongComments.Points", '分')}</span>
        {comment.chartId && (
          <Link to={commentPermalink(comment.chartId, comment.id)} className="text-sky-400 hover:underline">
            {i18n("song/SongComments.ViewInContext", '查看上下文')}
          </Link>
        )}
      </footer>
    </article>
  );
}

/** 分页的平铺评论列表，例如个人空间的评论历史。 */
export function CommentListView({ load, empty }: { load: (page: number, signal: AbortSignal) => Promise<CommentList>; empty: ReactNode }) {
  const { i18n } = useI18n();
  const [page, setPage] = useState(1);
  // 结果带着页码；翻页后旧页自然失效，不必在 effect 里清空
  const [result, setResult] = useState<{ page: number; data: CommentList } | null>(null);
  const [failure, setFailure] = useState<{ page: number; message: string } | null>(null);
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });
  useEffect(() => {
    const controller = new AbortController();
    loader
      .current(page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ page, data });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setFailure({ page, message: (e as Error).message });
      });
    return () => controller.abort();
  }, [page]);
  const data = result?.page === page ? result.data : null;
  const error = failure?.page === page ? failure.message : '';
  if (error) return <p className="py-6 text-red-300 text-sm text-center">{error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label={i18n("song/SongComments.Loading", '加载中')}>
        <LoadingSpinner size={32} />
      </div>
    );
  }
  if (data.items.length === 0) return <p className="py-8 text-white/50 text-sm text-center">{empty}</p>;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="space-y-3">
      {data.items.map((comment) => (
        <CommentSummary key={comment.id} comment={comment} />
      ))}
      {pages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-4 pt-2 text-white/80 text-sm">
          <button type="button" className={ghostButton} disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
            {i18n("song/SongComments.Previous", '上一页')}
          </button>
          <span className="tabular-nums">
            {page} / {pages}
          </span>
          <button type="button" className={ghostButton} disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
            {i18n("song/SongComments.Next", '下一页')}
          </button>
        </div>
      )}
    </div>
  );
}
