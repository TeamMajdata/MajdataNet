import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import type { Collection } from '@/types';
import { useLoc } from '@/hooks';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId?: string;
  onCreate?: () => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: { duration: 0.15 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.2 },
  }),
};

export default function CollectionModal({ isOpen, onClose, songId, onCreate }: CollectionModalProps) {
  const loc = useLoc();
  const [username, setUsername] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState<0 | 1>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch(endpoints.account.info, { mode: 'cors', credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.username) setUsername(data.username);
      })
      .catch(() => setUsername(null));
  }, [isOpen]);

  const { data, error, isLoading, mutate } = useSWR<Collection[]>(
    username ? endpoints.collection.list(0, 100, username) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsCreating(false);
      setNewName('');
      setNewDescription('');
      setNewVisibility(0);
      setAddingId(null);
    }
  }, [isOpen]);

  // Auto-focus name input when create form opens
  useEffect(() => {
    if (isCreating) nameInputRef.current?.focus();
  }, [isCreating]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const filteredCollections = (data || []).filter((c) => {
    const q = searchQuery.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  const handleAddToCollection = useCallback(async (collectionId: string) => {
    if (!songId || addingId) return;
    setAddingId(collectionId);
    try {
      const res = await fetch(endpoints.collection.addToCollection(collectionId), {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        toast.success(loc('AddSuccess', '已添加到收藏夹'));
        onClose();
      } else {
        toast.error(loc('AddFailed', '添加失败'));
      }
    } catch {
      toast.error(loc('AddFailed', '添加失败'));
    } finally {
      setAddingId(null);
    }
  }, [songId, addingId, onClose, loc]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || creatingLoading) return;
    setCreatingLoading(true);
    try {
      const res = await fetch(endpoints.collection.create, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim(), visibility: newVisibility }),
      });
      if (res.ok) {
        toast.success(loc('CreateSuccess', '创建成功'));
        setNewName('');
        setNewDescription('');
        setNewVisibility(0);
        setIsCreating(false);
        setSearchQuery('');
        mutate();
        onCreate?.();
      } else {
        toast.error(loc('CreateFailed', '创建失败'));
      }
    } catch {
      toast.error(loc('CreateFailed', '创建失败'));
    } finally {
      setCreatingLoading(false);
    }
  }, [newName, newDescription, newVisibility, creatingLoading, mutate, onCreate, loc]);

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewName('');
    setNewDescription('');
    setNewVisibility(0);
  };

  const title = songId
    ? loc('AddToCollection', '添加到收藏夹')
    : loc('MyCollections', '我的收藏夹');

  const hasCollections = data && data.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-9999">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-1/2 left-1/2 flex w-[90%] max-w-md max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(20,20,25,0.95)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={loc('Close', '关闭')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
              {isLoading && (
                <div className="flex w-full items-center justify-center py-16">
                  <LoadingSpinner size="36px" />
                </div>
              )}

              {!isLoading && error && (
                <div className="flex w-full items-center justify-center py-12">
                  <p className="text-sm text-white/40">{loc('LoadFailed', '加载失败')}</p>
                </div>
              )}

              {!isLoading && !error && !hasCollections && !isCreating && (
                <div className="flex w-full flex-col items-center justify-center gap-3 py-12">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/15">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                  <p className="text-sm text-white/40">{loc('NoCollections', '暂无收藏夹')}</p>
                </div>
              )}

              {hasCollections && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <svg
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/30"
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={loc('SearchCollections', '搜索收藏夹...')}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/25"
                    />
                  </div>

                  {filteredCollections.length === 0 && (
                    <div className="flex w-full items-center justify-center py-12">
                      <p className="text-sm text-white/30">{loc('NoResults', '没有找到匹配的收藏夹')}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {filteredCollections.map((collection, index) => {
                      const isAdding = addingId === collection.id;
                      return (
                        <motion.button
                          key={collection.id}
                          custom={index}
                          variants={listItemVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={songId ? { scale: 1.01 } : undefined}
                          whileTap={songId ? { scale: 0.98 } : undefined}
                          disabled={!!addingId}
                          onClick={songId ? () => handleAddToCollection(collection.id) : undefined}
                          className={`group flex items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                            songId ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
                          } ${isAdding ? 'bg-blue-500/10' : ''}`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isAdding ? 'bg-blue-500/15' : 'bg-white/5 group-hover:bg-white/10'
                          }`}>
                            {isAdding ? (
                              <LoadingSpinner size="18px" />
                            ) : (
                              <svg
                                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="text-white/40 transition-colors group-hover:text-white/60"
                              >
                                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                              </svg>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white/90">
                              {collection.name || loc('UnnamedCollection', '未命名收藏夹')}
                            </div>
                            {collection.description && (
                              <div className="mt-0.5 truncate text-xs text-white/40">{collection.description}</div>
                            )}
                          </div>

                          <div className="flex h-6 shrink-0 items-center justify-center rounded-full bg-white/5 px-2.5">
                            <span className="text-xs text-white/40">{collection.count}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Create form (collapsible) */}
              <AnimatePresence>
                {isCreating && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/70">
                          {loc('CollectionName', '名称')} <span className="text-red-400">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                          placeholder={loc('CollectionNamePlaceholder', '收藏夹名称')}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/70">
                          {loc('Description', '描述')}
                        </label>
                        <input
                          type="text"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder={loc('DescriptionPlaceholder', '描述内容（可选）')}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/70">
                          {loc('Visibility', '可见性')}
                        </label>
                        <select
                          value={newVisibility}
                          onChange={(e) => setNewVisibility(Number(e.target.value) as 0 | 1)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500/50"
                        >
                          <option value={0}>{loc('Private', '私有')}</option>
                          <option value={1}>{loc('Public', '公开')}</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleCreate}
                          disabled={!newName.trim() || creatingLoading}
                          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                        >
                          {creatingLoading ? (
                            <span className="flex items-center justify-center gap-2"><LoadingSpinner size="14px" /></span>
                          ) : (
                            loc('Create', '创建')
                          )}
                        </button>
                        <button
                          onClick={resetCreateForm}
                          disabled={creatingLoading}
                          className="flex-1 rounded-lg bg-white/5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loc('Cancel', '取消')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer: create button */}
            {(!isLoading || hasCollections) && !isCreating && (
              <div className="shrink-0 border-t border-white/5 px-5 py-3">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M5 12h14" />
                  </svg>
                  {loc('NewCollection', '新建收藏夹')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
