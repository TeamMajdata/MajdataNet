/**
 * SongComments 组件集 - 歌曲评论相关组件
 * 迁移自 legacy/src/app/song/page.jsx
 */

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import { FaComments } from 'react-icons/fa';
import { AiFillDelete, AiOutlineLoading3Quarters } from 'react-icons/ai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useLoc } from '@/hooks';
import type { 
  Comment, 
  CommentCardProps, 
  CommentComposerProps, 
  MarkdownCommentContentProps,
  CommentSenderProps,
  CommentThreadProps,
  CommentListProps
} from '@/types';

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
                className="inline-block px-1 py-0.5 rounded font-medium text-[#5c9ff6] no-underline transition-all duration-200"
                style={{
                  background: 'rgba(92, 190, 246, 0.08)'
                }}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(106, 173, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(92, 190, 246, 0.08)';
                }}
                {...rest}
              >
                {children}
              </a>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          );
        },
      }}
    >
      {processedContent}
    </Markdown>
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
        className="px-5 py-5 border rounded-xl focus:outline-none w-full min-h-30 font-inherit text-white text-base leading-relaxed resize-y"
        style={{
          background: 'linear-gradient(135deg, rgb(255 255 255 / 8%), rgb(255 255 255 / 4%))',
          backdropFilter: 'blur(15px)'
        }}
        animate={{
          borderColor: isFocused ? 'rgb(59 130 246 / 40%)' : 'rgb(255 255 255 / 20%)',
          boxShadow: isFocused 
            ? '0 6px 20px rgb(0 0 0 / 20%), 0 0 0 2px rgb(59 130 246 / 20%), inset 0 1px 0 rgb(255 255 255 / 15%)'
            : '0 4px 15px rgb(0 0 0 / 15%), inset 0 1px 0 rgb(255 255 255 / 10%)',
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
          className="px-3 py-1 border rounded text-[#4a9eff] text-xs cursor-pointer"
          style={{
            background: 'none',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}
          whileHover={{
            backgroundColor: 'rgba(74, 158, 255, 0.1)',
            borderColor: 'rgba(74, 158, 255, 0.3)'
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
            className="mb-2.5 p-3 border rounded-lg min-h-25 max-h-75 overflow-y-auto text-sm leading-normal"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {value.trim() ? (
              <MarkdownCommentContent content={value} />
            ) : (
              <div className="py-5 text-[#888] text-center italic">
                {loc('PreviewPlaceholder')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <motion.button
          className="px-5 py-2 border rounded-lg font-medium text-sm cursor-pointer"
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          style={{
            background: 'linear-gradient(135deg, rgb(59 130 246 / 20%), rgb(37 99 235 / 30%))',
            backdropFilter: 'blur(10px)',
            borderColor: 'rgb(59 130 246 / 30%)',
            color: '#e5e5e5',
            opacity: !value.trim() || isSubmitting ? 0.6 : 1,
            cursor: !value.trim() || isSubmitting ? 'not-allowed' : 'pointer',
          }}
          whileHover={!value.trim() || isSubmitting ? {} : {
            background: 'linear-gradient(135deg, rgb(59 130 246 / 30%), rgb(37 99 235 / 40%))',
            borderColor: 'rgb(59 130 246 / 50%)',
            y: -2,
            boxShadow: '0 8px 25px rgb(59 130 246 / 20%), 0 4px 12px rgb(0 0 0 / 30%)'
          }}
          transition={{ duration: 0.3 }}
        >
          {isSubmitting ? (
            <>
              <AiOutlineLoading3Quarters
                className="inline-block animate-spin"
                style={{ width: '16px', height: '16px', marginRight: '4px' }}
              />
              {loc('PleaseWait')}
            </>
          ) : (
            loc('Post')
          )}
        </motion.button>
        {isReply && onCancel && (
          <motion.button
            className="px-5 py-2 border rounded-lg font-medium text-sm cursor-pointer"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              background: 'rgb(255 255 255 / 3%)',
              borderColor: 'rgb(59 130 246 / 30%)',
              color: 'rgb(255 255 255 / 60%)',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            whileHover={isSubmitting ? {} : {
              background: 'rgb(255 255 255 / 8%)',
              color: 'rgb(255 255 255 / 80%)'
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
  const { mutate } = useSWR(apiroot3 + '/maichart/' + songid + '/interact');

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
        apiroot3 + '/maichart/' + songid + '/interact',
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
      className="mx-auto my-8 p-8 border rounded-2xl w-[70%]"
      style={{
        background: 'linear-gradient(135deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 5%))',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgb(255 255 255 / 10%)',
        boxShadow: '0 8px 25px rgb(0 0 0 / 30%), 0 4px 12px rgb(0 0 0 / 20%)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 text-center">
        <h3 className="m-0 font-semibold text-white text-2xl" style={{ textShadow: '0 2px 4px rgb(0 0 0 / 30%)' }}>{loc('Comment')}</h3>
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
  const [shouldShowExpandButton, setShouldShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const maxHeight = 200;
      setShouldShowExpandButton(contentRef.current.scrollHeight > maxHeight);
    }
  }, [comment.content]);

  return (
    <motion.div
      className={`flex flex-col gap-2 ${
        isReply 
          ? 'p-3 m-0 rounded-lg border w-full' 
          : 'px-7 py-5 mx-4 my-4 max-w-[33.33vw] rounded-xl border'
      }`}
      style={isReply ? {
        background: 'linear-gradient(135deg, rgb(255 255 255 / 6%), rgb(255 255 255 / 3%))',
        backdropFilter: 'blur(8px)',
        borderColor: 'rgb(255 255 255 / 8%)',
        boxShadow: '0 2px 8px rgb(0 0 0 / 15%)',
        minWidth: 0
      } : {
        background: 'linear-gradient(135deg, rgb(255 255 255 / 8%), rgb(255 255 255 / 4%))',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgb(255 255 255 / 10%)',
        boxShadow: '0 4px 15px rgb(0 0 0 / 20%), 0 2px 8px rgb(0 0 0 / 10%)'
      }}
      whileHover={{
        y: -1,
        boxShadow: isReply 
          ? '0 4px 12px rgb(0 0 0 / 20%)'
          : '0 6px 20px rgb(0 0 0 / 25%), 0 3px 10px rgb(0 0 0 / 15%)',
        borderColor: isReply
          ? 'rgb(255 255 255 / 12%)'
          : 'rgb(255 255 255 / 15%)'
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center">
        <motion.a 
          href={'/space?id=' + comment.sender} 
          className="flex items-center gap-3 text-inherit no-underline"
          whileHover={{ x: 2 }}
          transition={{ duration: 0.3 }}
        >
          <motion.img
            className={`rounded-full object-cover border-2 shrink-0 ${
              isReply ? 'w-7 h-7 min-w-7 min-h-7' : 'w-10.5 h-10.5 min-w-10.5 min-h-10.5'
            }`}
            style={{
              borderColor: 'rgb(255 255 255 / 15%)',
              aspectRatio: '1'
            }}
            whileHover={{
              borderColor: 'rgb(255 255 255 / 30%)',
              boxShadow: '0 3px 12px rgb(0 0 0 / 30%)'
            }}
            transition={{ duration: 0.3 }}
            src={apiroot3 + '/account/Icon?username=' + comment.sender}
            alt={comment.sender}
          />
          <div className="flex flex-col gap-0.5">
            <span className={`font-semibold text-white ${
              isReply ? 'text-sm' : 'text-base'
            }`} style={{ textShadow: '0 1px 2px rgb(0 0 0 / 30%)' }}>{comment.sender}</span>
            <span className={`font-normal ${
              isReply ? 'text-xs' : 'text-[0.85rem]'
            }`} style={{ color: 'rgb(255 255 255 / 50%)' }}>
              {new Date(comment.timestamp).toLocaleDateString()}
            </span>
          </div>
        </motion.a>
      </div>
      <div className="relative w-full">
        <div
          ref={contentRef}
          className={`leading-6 wrap-break-word select-text transition-all duration-300 ${
            isReply ? 'text-sm py-1' : 'text-base py-2'
          } ${
            !isContentExpanded && shouldShowExpandButton ? 'max-h-45 overflow-hidden relative' : ''
          }`}
          style={{ color: 'rgb(255 255 255 / 90%)' }}
        >
          <MarkdownCommentContent content={comment.content} comment={comment} />
          {!isContentExpanded && shouldShowExpandButton && (
            <div
              className="bottom-0 left-0 z-1 absolute w-full h-25 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(20, 20, 30, 0.4) 30%, rgba(20, 20, 30, 0.95) 90%)'
              }}
            />
          )}
        </div>
        {shouldShowExpandButton && (
          <motion.button
            className={`w-full px-2.5 py-2 border-none text-white text-[0.85rem] cursor-pointer font-medium flex items-center justify-center gap-1 ${
              !isContentExpanded 
                ? 'absolute bottom-0 left-0 h-15 pb-2.5 bg-transparent z-2' 
                : 'bg-[rgba(255,255,255,0.03)] border-t border-t-[rgba(255,255,255,0.05)]'
            }`}
            style={!isContentExpanded ? { 
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              alignItems: 'flex-end'
            } : {}}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            whileHover={isContentExpanded ? {
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff'
            } : {
              textShadow: '0 0 10px rgba(255, 255, 255, 0.4)'
            }}
            transition={{ duration: 0.2 }}
          >
            {isContentExpanded ? '▲ 点击收起' : '▼ 点击展开'}
          </motion.button>
        )}
      </div>
      <div className={`flex gap-2 pt-2 border-t border-t-[rgb(255_255_255/5%)] ${
        isReply ? 'border-t-0 pt-1 mt-0' : 'mt-2'
      }`}>
        {onReply && (
          <motion.button
            className={`flex justify-center items-center border rounded-md min-w-0 font-medium cursor-pointer ${
              isReply ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'
            }`}
            style={{
              color: 'rgb(255 255 255 / 70%)',
              background: 'rgb(255 255 255 / 5%)',
              borderColor: 'rgb(255 255 255 / 10%)',
              opacity: isCommentPending ? 0.5 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={() => onReply(comment)}
            disabled={isCommentPending}
            title={loc('Reply')}
            whileHover={isCommentPending ? {} : {
              color: 'rgb(255 255 255 / 90%)',
              background: 'rgb(255 255 255 / 10%)',
              borderColor: 'rgb(255 255 255 / 20%)',
              y: -1
            }}
            transition={{ duration: 0.2 }}
          >
            {isCommentPending ? (
              <AiOutlineLoading3Quarters className={`inline-block animate-spin ${isReply ? 'w-3 h-3' : 'w-4 h-4'}`} />
            ) : (
              <FaComments className={isReply ? 'w-3 h-3' : 'w-4 h-4'} />
            )}
          </motion.button>
        )}
        {canDelete && onDelete && (
          <motion.button
            className={`flex justify-center items-center border rounded-md min-w-0 font-medium cursor-pointer ${
              isReply ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'
            }`}
            style={{
              color: 'rgb(239 68 68 / 80%)',
              background: 'rgb(255 255 255 / 5%)',
              borderColor: 'rgb(255 255 255 / 10%)',
              opacity: isCommentPending ? 0.5 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={() => onDelete(comment)}
            disabled={isCommentPending}
            title={loc('DeleteComment')}
            whileHover={isCommentPending ? {} : {
              color: 'rgb(239 68 68 / 100%)',
              background: 'rgb(239 68 68 / 10%)',
              borderColor: 'rgb(239 68 68 / 30%)',
              y: -1
            }}
            transition={{ duration: 0.2 }}
          >
            {isCommentPending ? (
              <AiOutlineLoading3Quarters className={`inline-block animate-spin ${isReply ? 'w-3 h-3' : 'w-4 h-4'}`} />
            ) : (
              <AiFillDelete className={isReply ? 'w-3 h-3' : 'w-4 h-4'} />
            )}
          </motion.button>
        )}
        {!isReply && replyCount > 0 && onToggleReplies && (
          <motion.button
            className="ml-auto px-4 py-2 border rounded-md font-medium text-sm cursor-pointer"
            style={{
              color: 'rgb(255 255 255 / 70%)',
              background: 'rgb(255 255 255 / 5%)',
              borderColor: 'rgb(255 255 255 / 10%)',
              opacity: isCommentPending ? 0.5 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
            onClick={onToggleReplies}
            disabled={isCommentPending}
            whileHover={isCommentPending ? {} : {
              color: 'rgb(255 255 255 / 90%)',
              background: 'rgb(255 255 255 / 10%)',
              borderColor: 'rgb(255 255 255 / 20%)'
            }}
            transition={{ duration: 0.2 }}
          >
            {isRepliesExpanded
              ? `收起 ${replyCount} 条回复`
              : `展开 ${replyCount} 条回复`}
          </motion.button>
        )}
      </div>
    </motion.div>
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
  const [shouldShowExpandButton, setShouldShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const maxHeight = 200;
      setShouldShowExpandButton(contentRef.current.scrollHeight > maxHeight);
    }
  }, [comment.content]);

  return (
    <div 
      className="px-4 py-3 border rounded-lg transition-all"
      style={{
        background: 'linear-gradient(135deg, rgb(255 255 255 / 8%), rgb(255 255 255 / 4%))',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgb(255 255 255 / 10%)',
        boxShadow: '0 2px 8px rgb(0 0 0 / 15%)'
      }}
    >
      {/* 用户信息 */}
      <div className="flex items-center gap-2 mb-2">
        <a 
          href={'/space?id=' + comment.sender} 
          className="flex items-center gap-2 text-inherit no-underline"
        >
          <img
            className="border rounded-full w-9 h-9 object-cover shrink-0"
            style={{
              borderColor: 'rgb(255 255 255 / 15%)'
            }}
            src={apiroot3 + '/account/Icon?username=' + comment.sender}
            alt={comment.sender}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-white text-sm">{comment.sender}</span>
            <span className="font-normal text-xs" style={{ color: 'rgb(255 255 255 / 50%)' }}>
              {new Date(comment.timestamp).toLocaleDateString()}
            </span>
          </div>
        </a>
      </div>

      {/* 评论内容 */}
      <div className="relative">
        <div
          ref={contentRef}
          className={`text-sm leading-relaxed py-1 wrap-break-word select-text ${
            !isContentExpanded && shouldShowExpandButton ? 'max-h-40 overflow-hidden' : ''
          }`}
          style={{ color: 'rgb(255 255 255 / 90%)' }}
        >
          <MarkdownCommentContent content={comment.content} comment={comment} />
          {!isContentExpanded && shouldShowExpandButton && (
            <div
              className="bottom-0 left-0 z-1 absolute w-full h-20 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(20, 20, 30, 0.95))'
              }}
            />
          )}
        </div>

        {shouldShowExpandButton && (
          <button
            className="opacity-70 hover:opacity-100 mt-1 px-2 py-1 border-none w-full text-white text-xs cursor-pointer"
            style={{ background: 'transparent' }}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
          >
            {isContentExpanded ? '▲ 收起' : '▼ 展开'}
          </button>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'rgb(255 255 255 / 5%)' }}>
        <button
          className="px-2 py-1 border rounded text-xs transition-colors cursor-pointer"
          style={{
            background: 'rgb(255 255 255 / 5%)',
            borderColor: 'rgb(255 255 255 / 10%)',
            color: 'rgb(255 255 255 / 70%)',
            opacity: isCommentPending ? 0.5 : 1,
            cursor: isCommentPending ? 'not-allowed' : 'pointer'
          }}
          onClick={() => onReply(comment)}
          disabled={isCommentPending}
          title={loc('Reply')}
          onMouseEnter={(e) => {
            if (!isCommentPending) {
              e.currentTarget.style.background = 'rgb(255 255 255 / 10%)';
              e.currentTarget.style.color = 'rgb(255 255 255 / 90%)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgb(255 255 255 / 5%)';
            e.currentTarget.style.color = 'rgb(255 255 255 / 70%)';
          }}
        >
          {isCommentPending ? (
            <AiOutlineLoading3Quarters className="inline-block w-3 h-3 animate-spin" />
          ) : (
            <><FaComments className="inline-block mr-1 w-3 h-3" />{loc('Reply')}</>
          )}
        </button>
        {canDelete && (
          <button
            className="px-2 py-1 border rounded text-xs transition-colors cursor-pointer"
            style={{
              background: 'rgb(255 255 255 / 5%)',
              borderColor: 'rgb(255 255 255 / 10%)',
              color: 'rgb(239 68 68 / 80%)',
              opacity: isCommentPending ? 0.5 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={() => onDelete(comment)}
            disabled={isCommentPending}
            title={loc('DeleteComment')}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.background = 'rgb(239 68 68 / 10%)';
                e.currentTarget.style.color = 'rgb(239 68 68)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgb(255 255 255 / 5%)';
              e.currentTarget.style.color = 'rgb(239 68 68 / 80%)';
            }}
          >
            {isCommentPending ? (
              <AiOutlineLoading3Quarters className="inline-block w-3 h-3 animate-spin" />
            ) : (
              <><AiFillDelete className="inline-block mr-1 w-3 h-3" />{loc('DeleteComment')}</>
            )}
          </button>
        )}
        {replies.length > 0 && (
          <button
            className="ml-auto px-2 py-1 border rounded text-xs transition-colors cursor-pointer"
            style={{
              background: 'rgb(255 255 255 / 5%)',
              borderColor: 'rgb(255 255 255 / 10%)',
              color: 'rgb(59 130 246 / 90%)',
              opacity: isCommentPending ? 0.5 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer'
            }}
            onClick={onToggleReplies}
            disabled={isCommentPending}
            onMouseEnter={(e) => {
              if (!isCommentPending) {
                e.currentTarget.style.background = 'rgb(59 130 246 / 10%)';
                e.currentTarget.style.color = 'rgb(59 130 246)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgb(255 255 255 / 5%)';
              e.currentTarget.style.color = 'rgb(59 130 246 / 90%)';
            }}
          >
            {isExpanded ? `▲ 收起 ${replies.length} 条` : `▼ 展开 ${replies.length} 条`}
          </button>
        )}
      </div>

      {/* 回复输入框 */}
      {replyComposer}

      {/* 回复列表 */}
      <AnimatePresence>
        {isExpanded && replies.length > 0 && (
          <motion.div 
            className="gap-2 grid mt-3 pt-3 border-t overflow-hidden"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              borderColor: 'rgb(255 255 255 / 5%)'
            }}
            initial={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem', paddingTop: '0.75rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ======================== Comment List ========================
export function CommentList({ songid }: CommentListProps) {
  const loc = useLoc();
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replyTargetUser, setReplyTargetUser] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(apiroot3 + '/account/info/', {
      mode: 'cors',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.username) {
          setCurrentUser(data.username);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    apiroot3 + '/maichart/' + songid + '/interact',
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
        apiroot3 + '/maichart/' + songid + '/interact',
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
        apiroot3 + '/maichart/' + songid + '/interact',
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
        style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white' }}
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
    <div className="max-w-(--container-max-width) mx-(--container-margin) mt-8 px-(--container-padding)">
      {comments.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p>{loc('NoComments')}</p>
        </div>
      ) : (
        <div className="gap-4 grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {comments.map((comment: Comment) => {
            const isExpanded = expandedComments.has(comment.id);

            return (
              <div key={comment.id}>
              <CommentThread
                comment={comment}
                currentUser={currentUser}
                onReply={handleReply}
                onDelete={handleDelete}
                isPending={pendingAction}
                isSubmittingReply={isSubmitting && replyThreadId === comment.id}
                isExpanded={isExpanded}
                onToggleReplies={() => handleToggleReplies(comment.id)}
                replyComposer={
                  <AnimatePresence>
                    {replyThreadId === comment.id && (
                      <motion.div 
                        className="mt-4 p-4 border rounded-lg" 
                        style={{ 
                          background: 'rgb(255 255 255 / 3%)', 
                          borderColor: 'rgb(255 255 255 / 8%)' 
                        }}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                }
              />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
