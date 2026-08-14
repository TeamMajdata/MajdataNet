/**
 * SongComments 组件集- 歌曲评论相关组件
 * 迁移自 legacy/src/app/song/page.jsx
 */

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import { AiFillDelete } from 'react-icons/ai';
import { Reply } from 'lucide-react';
import { LoadingSpinner } from '@/components';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useLoc, useUserContext } from '@/hooks';
import 'github-markdown-css/github-markdown-light.css';
import type {
  Comment,
  CommentCardProps,
  CommentComposerProps,
  MarkdownCommentContentProps,
  CommentSenderProps,
  CommentThreadProps,
  CommentListProps
} from '@/types';
import { Link } from 'react-router-dom';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());


function MarkdownCommentContent({ content, comment }: MarkdownCommentContentProps) {
  let processedContent = '';
  if (comment) {
    if (comment.contentBody) {
      processedContent =
        comment.contentPrefix +
        comment.contentBody.replace(
          /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
          (_match, username) => {
            return `[@${username}](/space?id=${encodeURIComponent(username)})`;
          }
        );
    } else {
      processedContent = comment.content.replace(
        /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
        (_match, username) => {
          return `[@${username}](/space?id=${encodeURIComponent(username)})`;
        }
      );
    }
  } else {
    processedContent = content.replace(
      /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
      (_match, username) => {
        return `[@${username}](/space?id=${encodeURIComponent(username)})`;
      }
    );
  }

  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          ol(props) {
            const { ...rest } = props;
            return <ol type="1" {...rest} />;
          },
          ul(props) {
            const { ...rest } = props;
            return <ul style={{ listStyleType: 'disc' }} {...rest} />;
          },
          img(props) {
            const { ...rest } = props;
            return <img style={{ width: '200px', height: 'auto' }} {...rest} />;
          },
          a(props) {
            const { href, children, ...rest } = props;
            if (
              href &&
              href.startsWith('/space?id=') &&
              children &&
              Array.isArray(children) &&
              typeof children[0] === 'string' &&
              children[0].startsWith('@')
            ) {
              return (
                <a
                  href={href}
                  className="inline-block px-1 py-0.5 rounded font-medium no-underline transition-all duration-200"
                  style={{
                    color: 'var(--primary)',
                    background: 'var(--primary-soft)',
                    textDecoration: 'none'
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)';
                  }}
                  {...rest}
                >
                  {children}
                </a>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-colors duration-200"
                style={{ color: 'var(--primary)', textDecoration: 'none' }}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}


export function CommentComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus = false,
  isReply = false,
  isSubmitting = false,
}: CommentComposerProps) {
  const loc = useLoc();
  const [showPreview, setShowPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`flex flex-col gap-3 ${isReply ? 'p-0' : ''}`}>
      <motion.textarea
        className="px-5 py-5 focus:outline-none w-full min-h-30 font-inherit text-ink text-base leading-relaxed resize-y rounded-lg border border-line"
        style={{
          background: 'var(--surface)'
        }}
        animate={{
          borderColor: isFocused ? 'var(--primary)' : 'var(--line)',
          y: isFocused ? -1 : 0
        }}
        transition={{ duration: 0.3 }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        value={value}
        autoFocus={autoFocus}
        disabled={isSubmitting}
      />

      <div className="my-2 text-right">
        <motion.button
          className="px-3 py-1 text-primary text-xs cursor-pointer bg-transparent border-none"
          whileHover={{
            color: 'var(--primary-hover)'
          }}
          transition={{ duration: 0.2 }}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? loc('HidePreview') : loc('ShowPreview')}
        </motion.button>
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            className="mb-2.5 p-3 min-h-25 max-h-75 overflow-y-auto text-sm leading-normal"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {value.trim() ? (
              <MarkdownCommentContent content={value} />
            ) : (
              <div className="py-5 text-ink-3 text-center italic">
                {loc('PreviewPlaceholder')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end items-center gap-2">
        <motion.button
          className="bg-primary px-5 py-2 border-none rounded-md font-medium text-white text-sm"
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          style={{
            opacity: !value.trim() || isSubmitting ? 0.6 : 1,
            cursor: !value.trim() || isSubmitting ? 'not-allowed' : 'pointer',
          }}
          whileHover={!value.trim() || isSubmitting ? {} : {
            backgroundColor: 'var(--primary-hover)',
            y: -2
          }}
          transition={{ duration: 0.3 }}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner className="inline-block" size="16px" />
              <div style={{ width: '4px', display: 'inline-block' }}></div>
              {loc('PleaseWait')}
            </>
          ) : (
            loc('Post')
          )}
        </motion.button>
        {isReply && onCancel && (
          <motion.button
            className="px-5 py-2 font-medium text-ink-2 text-sm bg-transparent border-none"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            whileHover={isSubmitting ? {} : {
              color: 'var(--primary-hover)'
            }}
            transition={{ duration: 0.3 }}
          >
            {loc('CancelReply')}
          </motion.button>
        )}
      </div>
    </div>
  );
}

export function CommentSender({ songid }: CommentSenderProps) {
  const loc = useLoc();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWR(endpoints.maichart.interact(songid));

  const onSubmit = async () => {
    if (comment.trim() === '') {
      toast.error(loc('EmptyComment'));
      return;
    }

    const formData = new FormData();
    formData.set('type', 'comment');
    formData.set('content', comment);

    setIsSubmitting(true);
    const sending = toast.loading(loc('Sending'));

    try {
      const response = await fetch(
        endpoints.maichart.interact(songid),
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
          credentials: 'include',
        }
      );

      toast.done(sending);

      if (response.status === 200) {
        toast.success(loc('CommentSuccess'));
        setComment('');
        mutate();
      } else if (response.status === 400) {
        toast.error(loc('CommentFailedLoginPrompt'));
      } else {
        toast.error(loc('CommentFailedLoginPrompt'));
      }
    } catch {
      toast.done(sending);
      toast.error(loc('CommentFailedLoginPrompt'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="mx-auto my-8 p-6 md:p-8 rounded-xl w-[70%]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 text-center">
        <h3 className="m-0 font-bold text-ink text-2xl">{loc('Comment')}</h3>
      </div>
      <div className="flex flex-col gap-4">
        <CommentComposer
          value={comment}
          onChange={setComment}
          onSubmit={onSubmit}
          placeholder={loc('CommentPlaceholder')}
          isSubmitting={isSubmitting}
        />
      </div>
    </motion.div>
  );
}


function CommentCard({
  comment,
  currentUser,
  onReply,
  onDelete,
  isPending,
  isReply = false,
  onToggleReplies,
  isRepliesExpanded,
  replyCount = 0,
}: CommentCardProps) {
  const loc = useLoc();
  const canDelete = currentUser && comment.sender === currentUser;
  const isCommentPending = isPending === comment.id;
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  // 超过 300 字才收纳
  const shouldShowExpandButton = (comment.content || '').length > 300;
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`flex flex-col ${isReply
        ? 'my-3 p-0 gap-2 max-w-[600px]'
        : 'px-5 py-4 mx-4 my-4 max-w-70 rounded-lg gap-3'
        }`}
      style={isReply ? {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        backdropFilter: 'none'
      } : {
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        if (!isReply) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgb(16 24 40 / 0.08)';
          e.currentTarget.style.borderColor = 'var(--line-strong)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isReply) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgb(16 24 40 / 0.05)';
          e.currentTarget.style.borderColor = 'var(--line)';
        }
      }}
    >
      <div className="flex items-center">
        <Link
          to={'/space?id=' + comment.sender}
          className="flex items-center gap-2 text-inherit no-underline transition-all duration-300"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <img
            className={`rounded-full object-cover border-2 shrink-0 transition-all duration-300 ${isReply ? 'w-7 h-7 min-w-7 min-h-7' : 'w-9 h-9 min-w-9 min-h-9'
              }`}
            style={{
              borderColor: 'var(--line)',
              aspectRatio: '1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--line-strong)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgb(16 24 40 / 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            src={endpoints.account.icon(comment.sender)}
            alt={comment.sender}
          />
          <div className="flex flex-col gap-0.5">
            <span className={`font-semibold text-ink ${isReply ? 'text-sm' : 'text-base'
              }`}>
              {comment.sender}
            </span>
            <span className={`font-normal ${isReply ? 'text-xs' : 'text-[0.85rem]'
              } text-ink-3`}>
              {new Date(comment.timestamp).toLocaleDateString()}
            </span>
          </div>
        </Link>
      </div>
      <div className="relative w-full">
        <div
          ref={contentRef}
          className={`leading-6 wrap-break-word select-text transition-all duration-300 ${isReply ? 'text-sm py-1' : 'text-base py-2'
            } text-ink ${!isContentExpanded && shouldShowExpandButton ? 'max-h-45 overflow-hidden relative' : ''
            }`}
        >
          <MarkdownCommentContent content={comment.content} comment={comment} />
        </div>
        {shouldShowExpandButton && (
          <button
            className={`w-full px-2.5 py-2 border-none text-ink-2 text-[0.85rem] cursor-pointer font-medium flex items-center justify-center gap-1 transition-all duration-200 ${!isContentExpanded
              ? 'absolute bottom-0 left-0 h-15 pb-2.5 bg-transparent z-2'
              : 'bg-transparent'
              }`}
            style={!isContentExpanded ? {
              alignItems: 'flex-end'
            } : {}}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            onMouseEnter={(e) => {
              if (isContentExpanded) {
                e.currentTarget.style.color = 'var(--ink)';
              }
            }}
          >
            {isContentExpanded ? '▲ 点击收起' : '▼ 点击展开'}
          </button>
        )}
      </div>
      <div className={`flex gap-2 pt-2 border-t border-line ${isReply ? 'border-t-0 pt-1 mt-0' : 'mt-1.5'
        }`}>
        {canDelete && onDelete && (
          <button
            className={`flex justify-center items-center min-w-0 font-medium cursor-pointer transition-all duration-200 bg-transparent border-none text-danger ${isReply ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
              }`}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={() => onDelete(comment)}
            disabled={isCommentPending}
            title={loc('DeleteComment')}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isCommentPending ? (
              <LoadingSpinner className="inline-block" size="12px" />
            ) : (
              <AiFillDelete className="w-3 h-3" />
            )}
          </button>
        )}
        {!isReply && replyCount > 0 && onToggleReplies && (
          <button
            className="px-3 py-1.5 font-medium text-xs transition-all duration-200 cursor-pointer bg-transparent border-none text-ink-2"
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
            onClick={onToggleReplies}
            disabled={isCommentPending}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.color = 'var(--ink)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-2)';
            }}
          >
            {isRepliesExpanded
              ? `收起 ${replyCount} 条回复`
              : `展开 ${replyCount} 条回复`}
          </button>
        )}
        {onReply && (
          <button
            className={`ml-auto flex justify-center items-center min-w-0 font-medium cursor-pointer transition-all duration-200 bg-transparent border-none text-ink-2 ${isReply ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
              }`}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={() => onReply(comment)}
            disabled={isCommentPending}
            title={loc('Reply')}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.color = 'var(--ink)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isCommentPending ? (
              <LoadingSpinner className="inline-block" size="12px" />
            ) : (
              <Reply className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ======================== Comment Thread ========================
function CommentThread({
  comment,
  currentUser,
  onReply,
  onDelete,
  isPending,
  isSubmittingReply,
  isExpanded,
  onToggleReplies,
  replyComposer,
}: CommentThreadProps) {
  const loc = useLoc();

  function flattenComments(comments: Comment[] | undefined, parentId: string) {
    const result: Comment[] = [];
    if (!comments) {
      return result;
    }
    const stack = [...comments];

    while (stack.length > 0) {
      const orig = stack.pop()!;
      const item = { ...orig };
      result.push(item);

      if (item.replies && item.replies.length > 0) {
        for (let i = item.replies.length - 1; i >= 0; i--) {
          const origReply = item.replies[i];
          const replyComment = { ...origReply };
          replyComment.replyTo = item.id;
          stack.push(replyComment);
        }
      }
      item.replies = undefined;
    }

    for (let i = 0; i < result.length; i++) {
      const c = result[i];
      if (!c.replyTo) {
        c.replies = undefined;
        c.replyTo = parentId;
        c.contentPrefix = '';
        c.contentBody = c.content;
      } else {
        const target = result.find((item) => item.id === c.replyTo);
        if (target) {
          const origContent = c.content;
          c.contentPrefix = `${loc('ReplyTo')} [@${target.sender}](/space?id=${encodeURIComponent(target.sender)}): `;
          c.contentBody = origContent;
          c.content = c.contentPrefix + c.contentBody;
        }
      }
    }

    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  const canDelete = currentUser && comment.sender === currentUser;
  const replies = flattenComments(comment.replies, comment.id);
  const isCommentPending = isPending === comment.id || isSubmittingReply;
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  // 超过 300 字才收纳
  const shouldShowExpandButton = (comment.content || '').length > 300;
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="bg-surface w-full px-5 py-4 rounded-lg border border-line shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {/* 用户信息 */}
      <div className="flex items-center">
        <Link
          to={'/space?id=' + comment.sender}
          className="flex items-center gap-2 text-inherit no-underline transition-all duration-300"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <img
            className="border-2 rounded-full w-9 min-w-9 h-9 min-h-9 object-cover transition-all duration-300 shrink-0"
            style={{
              borderColor: 'var(--line)',
              aspectRatio: '1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--line-strong)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgb(16 24 40 / 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            src={endpoints.account.icon(comment.sender)}
            alt={comment.sender}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-ink text-base">{comment.sender}</span>
            <span className="font-normal text-ink-3 text-[0.85rem]">
              {new Date(comment.timestamp).toLocaleDateString()}
            </span>
          </div>
        </Link>
      </div>

      {/* 评论内容 */}
      <div className="relative w-full">
        <div
          ref={contentRef}
          className={`text-base py-2 leading-6 wrap-break-word select-text transition-all duration-300 text-ink ${!isContentExpanded && shouldShowExpandButton ? 'max-h-45 overflow-hidden relative' : ''
            }`}
        >
          <MarkdownCommentContent content={comment.content} comment={comment} />
        </div>

        {shouldShowExpandButton && (
          <button
            className={`w-full px-2.5 py-2 border-none text-ink-2 text-[0.85rem] cursor-pointer font-medium flex items-center justify-center gap-1 transition-all duration-200 ${!isContentExpanded
              ? 'absolute bottom-0 left-0 h-15 pb-2.5 bg-transparent z-2'
              : 'bg-transparent'
              }`}
            style={!isContentExpanded ? {
              alignItems: 'flex-end'
            } : {}}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            onMouseEnter={(e) => {
              if (isContentExpanded) {
                e.currentTarget.style.color = 'var(--ink)';
              }
            }}
          >
            {isContentExpanded ? '▲ 点击收起' : '▼ 点击展开'}
          </button>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-1.5 pt-2 border-t border-line">
        {canDelete && (
          <button
            className="flex justify-center items-center px-2.5 py-1.5 text-danger text-xs transition-all duration-200 cursor-pointer bg-transparent border-none"
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
              minWidth: 0
            }}
            onClick={() => onDelete(comment)}
            disabled={isCommentPending}
            title={loc('DeleteComment')}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isCommentPending ? (
              <LoadingSpinner className="inline-block" size="12px" />
            ) : (
              <AiFillDelete className="w-3 h-3" />
            )}
          </button>
        )}
        {replies.length > 0 && (
          <button
            className="px-3 py-1.5 text-ink-2 font-medium text-xs transition-all duration-200 cursor-pointer bg-transparent border-none"
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={onToggleReplies}
            disabled={isCommentPending}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.color = 'var(--ink)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-2)';
            }}
          >
            {isExpanded ? `收起 ${replies.length} 条回复` : `展开 ${replies.length} 条回复`}
          </button>
        )}
        <button
          className="ml-auto flex justify-center items-center px-2.5 py-1.5 text-ink-2 text-xs transition-all duration-200 cursor-pointer bg-transparent border-none"
          style={{
            opacity: isCommentPending ? 0.6 : 1,
            cursor: isCommentPending ? 'not-allowed' : 'pointer',
            minWidth: 0
          }}
          onClick={() => onReply(comment)}
          disabled={isCommentPending}
          title={loc('Reply')}
          onMouseEnter={(e) => {
            if (!isCommentPending) {
              e.currentTarget.style.color = 'var(--ink)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--ink-2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isCommentPending ? (
            <LoadingSpinner className="inline-block" size="12px" />
          ) : (
            <Reply className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 回复输入框*/}
      {replyComposer}

      {/* 回复列表 */}
      {isExpanded && replies.length > 0 && (
        <div
          className="relative mt-4 pt-0 pl-6 border-line max-w-[600px]"
        >
          <div
            className="top-0 left-0 absolute w-0.5 h-full bg-line"
          />
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={(replyComment) => onReply(replyComment, comment)}
              onDelete={onDelete}
              isPending={isPending}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ======================== Comment List ========================
export function CommentList({ songid }: CommentListProps) {
  const loc = useLoc();
  const { username: currentUser } = useUserContext();
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replyTargetUser, setReplyTargetUser] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const { data, error, isLoading, mutate } = useSWR(
    endpoints.maichart.interact(songid),
    fetcher,
    {
      refreshInterval: replyThreadId ? 0 : 3000,
    }
  );

  const handleToggleReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleReply = (comment: Comment, parentComment?: Comment) => {
    const topLevelCommentId = parentComment ? parentComment.id : comment.id;

    if (
      replyThreadId === topLevelCommentId &&
      replyTargetUser === comment.sender
    ) {
      setReplyTargetId(null);
      setReplyThreadId(null);
      setReplyTargetUser(null);
      setReplyContent('');
    } else {
      setReplyThreadId(topLevelCommentId);
      if (parentComment) {
        setReplyTargetUser(comment.sender);
        setReplyTargetId(comment.id);
      } else {
        setReplyTargetUser(null);
        setReplyTargetId(topLevelCommentId);
      }
      setReplyContent('');
      setExpandedComments((prev) => new Set(prev).add(topLevelCommentId));
    }
  };

  const handleCancelReply = () => {
    setReplyTargetId(null);
    setReplyThreadId(null);
    setReplyTargetUser(null);
    setReplyContent('');
  };

  const handleSubmitReply = async () => {
    if (replyContent.trim() === '') {
      toast.error(loc('EmptyComment'));
      return;
    }

    const formData = new FormData();
    formData.set('type', 'comment');
    formData.set('content', replyContent);
    formData.set('replyTo', replyTargetId || '');

    setIsSubmitting(true);
    const sending = toast.loading(loc('Sending'));

    try {
      const response = await fetch(
        endpoints.maichart.interact(songid),
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
          credentials: 'include',
        }
      );

      toast.done(sending);

      if (response.status === 200) {
        toast.success(loc('ReplySuccess'));
        setReplyContent('');
        setReplyThreadId(null);
        setReplyTargetId(null);
        setReplyTargetUser(null);
        mutate();
      } else if (response.status === 400) {
        toast.error(loc('CommentFailedLoginPrompt'));
      } else {
        toast.error(loc('CommentFailedLoginPrompt'));
      }
    } catch {
      toast.done(sending);
      toast.error(loc('CommentFailedLoginPrompt'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    if (!window.confirm(loc('DeleteCommentConfirm'))) {
      return;
    }

    const formData = new FormData();
    formData.set('type', 'comment');
    formData.set('commentId', comment.id);

    setPendingAction(comment.id);

    try {
      const response = await fetch(
        endpoints.maichart.interact(songid),
        {
          method: 'DELETE',
          body: formData,
          mode: 'cors',
          credentials: 'include',
        }
      );

      if (response.status === 200) {
        toast.success(loc('DeleteSuccess'));
        mutate();
      } else if (response.status === 400) {
        toast.error(loc('DeleteFailed') + ': ' + loc('FailedLoginPrompt'));
      } else {
        toast.error(loc('DeleteFailed'));
      }
    } catch {
      toast.error(loc('DeleteFailed'));
    } finally {
      setPendingAction(null);
    }
  };

  if (error) {
    return <div>failed to load</div>;
  }
  if (isLoading) {
    return (
      <motion.div
        className="inline-block border-4 rounded-full w-12 h-12"
        style={{ borderColor: 'var(--line-strong)', borderTopColor: 'var(--primary)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    );
  }
  if (data === '' || data === undefined) {
    return <div>failed to load</div>;
  }

  const comments = Array.isArray(data.comments) ? data.comments : [];

  return (
    <div className="mt-8 w-full">
      {comments.length === 0 ? (
        <div className="px-4 py-12 w-full text-center text-ink-3">
          <p>{loc('NoComments')}</p>
        </div>
      ) : (
        <div className="gap-3 grid grid-cols-1 w-full max-w-[600px] mx-auto">
          {comments.map((comment: Comment) => {
            const isExpanded = expandedComments.has(comment.id);

            return (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                onReply={handleReply}
                onDelete={handleDelete}
                isPending={pendingAction}
                isSubmittingReply={isSubmitting && replyThreadId === comment.id}
                isExpanded={isExpanded}
                onToggleReplies={() => handleToggleReplies(comment.id)}
                replyComposer={
                  replyThreadId === comment.id && (
                    <div
                      className="mt-4 p-4"
                    >
                      <CommentComposer
                        value={replyContent}
                        onChange={setReplyContent}
                        onSubmit={handleSubmitReply}
                        onCancel={handleCancelReply}
                        placeholder={
                          replyTargetUser
                            ? `${loc('ReplyTo')} @${replyTargetUser}`
                            : loc('ReplyPlaceholder')
                        }
                        autoFocus={true}
                        isReply={true}
                        isSubmitting={isSubmitting}
                      />
                    </div>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
