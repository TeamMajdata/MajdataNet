/**
 * SongComments 组件集 - 歌曲评论相关组件
 * 迁移自 legacy/src/app/song/page.jsx
 */

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
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
                className="comment-mention"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
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

  return (
    <div className={`comment-composer ${isReply ? 'comment-composer-reply' : ''}`}>
      <textarea
        className="userinput commentbox modern-textarea"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        value={value}
        autoFocus={autoFocus}
        disabled={isSubmitting}
      />

      <div className="comment-preview-toggle">
        <button
          className="preview-toggle-btn"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? loc('HidePreview') : loc('ShowPreview')}
        </button>
      </div>

      {showPreview && (
        <div className="markdown-preview comment-preview">
          {value.trim() ? (
            <MarkdownCommentContent content={value} />
          ) : (
            <div className="preview-placeholder">
              {loc('PreviewPlaceholder')}
            </div>
          )}
        </div>
      )}

      <div className="comment-actions">
        <button
          className="linkContentWithBorder modern-interaction-btn comment-action-btn"
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          style={{
            opacity: !value.trim() || isSubmitting ? 0.6 : 1,
            cursor: !value.trim() || isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? (
            <>
              <AiOutlineLoading3Quarters
                className="loading-icon-spin"
                style={{ width: '16px', height: '16px', marginRight: '4px' }}
              />
              {loc('PleaseWait')}
            </>
          ) : (
            loc('Post')
          )}
        </button>
        {isReply && onCancel && (
          <button
            className="linkContentWithBorder modern-interaction-btn comment-action-btn cancel-btn"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {loc('CancelReply')}
          </button>
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
    <div className="song-comment-sender">
      <div className="comment-sender-header">
        <h3 className="comment-sender-title">{loc('Comment')}</h3>
      </div>
      <div className="comment-input-section">
        <CommentComposer
          value={comment}
          onChange={setComment}
          onSubmit={onSubmit}
          placeholder={loc('CommentPlaceholder')}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
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
    <div
      className={`comment-card modern-comment-card ${isReply ? 'comment-card--reply' : ''}`}
    >
      <div className="comment-header">
        <a href={'/space?id=' + comment.sender} className="commenter-link">
          <img
            className="commenter-avatar"
            src={apiroot3 + '/account/Icon?username=' + comment.sender}
            alt={comment.sender}
          />
          <div className="commenter-info">
            <span className="commenter-username">{comment.sender}</span>
            <span className="comment-timestamp">
              {new Date(comment.timestamp).toLocaleDateString()}
            </span>
          </div>
        </a>
      </div>
      <div className="comment-content-wrapper">
        <div
          ref={contentRef}
          className={`comment-content ${!isContentExpanded && shouldShowExpandButton ? 'comment-content-collapsed' : ''}`}
        >
          <MarkdownCommentContent content={comment.content} comment={comment} />
        </div>
        {shouldShowExpandButton && (
          <button
            className={`comment-expand-btn ${!isContentExpanded ? 'comment-expand-btn-merged' : ''}`}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
          >
            {isContentExpanded ? '▲ 点击收起' : '▼ 点击展开'}
          </button>
        )}
      </div>
      <div className="comment-footer">
        {onReply && (
          <button
            className="comment-footer-btn comment-icon-btn"
            onClick={() => onReply(comment)}
            disabled={isCommentPending}
            title={loc('Reply')}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isCommentPending ? (
              <AiOutlineLoading3Quarters className="loading-icon-spin" />
            ) : (
              <FaComments />
            )}
          </button>
        )}
        {canDelete && onDelete && (
          <button
            className="comment-footer-btn delete-btn comment-icon-btn"
            onClick={() => onDelete(comment)}
            disabled={isCommentPending}
            title={loc('DeleteComment')}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isCommentPending ? (
              <AiOutlineLoading3Quarters className="loading-icon-spin" />
            ) : (
              <AiFillDelete />
            )}
          </button>
        )}
        {!isReply && replyCount > 0 && onToggleReplies && (
          <button
            className="comment-footer-btn expand-btn"
            onClick={onToggleReplies}
            disabled={isCommentPending}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isRepliesExpanded
              ? `收起 ${replyCount} 条回复`
              : `展开 ${replyCount} 条回复`}
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
  const [shouldShowExpandButton, setShouldShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const maxHeight = 200;
      setShouldShowExpandButton(contentRef.current.scrollHeight > maxHeight);
    }
  }, [comment.content]);

  return (
    <div className="comment-card modern-comment-card">
      <div className="comment-header">
        <a href={'/space?id=' + comment.sender} className="commenter-link">
          <img
            className="commenter-avatar"
            src={apiroot3 + '/account/Icon?username=' + comment.sender}
            alt={comment.sender}
          />
          <div className="commenter-info">
            <span className="commenter-username">{comment.sender}</span>
            <span className="comment-timestamp">
              {new Date(comment.timestamp).toLocaleDateString()}
            </span>
          </div>
        </a>
      </div>

      <div className="comment-content-wrapper">
        <div
          ref={contentRef}
          className={`comment-content ${!isContentExpanded && shouldShowExpandButton ? 'comment-content-collapsed' : ''}`}
        >
          <MarkdownCommentContent content={comment.content} comment={comment} />
        </div>

        {shouldShowExpandButton && (
          <button
            className={`comment-expand-btn ${!isContentExpanded ? 'comment-expand-btn-merged' : ''}`}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
          >
            {isContentExpanded ? '▲ 点击收起' : '▼ 点击展开'}
          </button>
        )}
      </div>

      <div className="comment-footer">
        <button
          className="comment-footer-btn comment-icon-btn"
          onClick={() => onReply(comment)}
          disabled={isCommentPending}
          title={loc('Reply')}
          style={{
            opacity: isCommentPending ? 0.6 : 1,
            cursor: isCommentPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isCommentPending ? (
            <AiOutlineLoading3Quarters className="loading-icon-spin" />
          ) : (
            <FaComments />
          )}
        </button>
        {canDelete && (
          <button
            className="comment-footer-btn delete-btn comment-icon-btn"
            onClick={() => onDelete(comment)}
            disabled={isCommentPending}
            title={loc('DeleteComment')}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isCommentPending ? (
              <AiOutlineLoading3Quarters className="loading-icon-spin" />
            ) : (
              <AiFillDelete />
            )}
          </button>
        )}
        {replies.length > 0 && (
          <button
            className="comment-footer-btn expand-btn"
            onClick={onToggleReplies}
            disabled={isCommentPending}
            style={{
              opacity: isCommentPending ? 0.6 : 1,
              cursor: isCommentPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isExpanded
              ? `收起 ${replies.length} 条回复`
              : `展开 ${replies.length} 条回复`}
          </button>
        )}
      </div>

      {replyComposer}

      {isExpanded && replies.length > 0 && (
        <div className="comment-reply-list">
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
    return <div className="loading"></div>;
  }
  if (data === '' || data === undefined) {
    return <div>failed to load</div>;
  }

  const comments = Array.isArray(data.comments) ? data.comments : [];

  return (
    <div className="theList song-comment-list">
      {comments.length === 0 ? (
        <div className="no-comments-placeholder">
          <p>{loc('NoComments')}</p>
        </div>
      ) : (
        comments.map((comment: Comment) => {
          const isExpanded = expandedComments.has(comment.id);

          return (
            <div key={comment.id} className="comment-thread-container">
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
                  replyThreadId === comment.id && (
                    <div className="reply-composer-wrapper">
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
            </div>
          );
        })
      )}
    </div>
  );
}
