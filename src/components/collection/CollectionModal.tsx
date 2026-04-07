import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import type { Collection } from '@/types';
import { useLoc, useUserContext } from '@/hooks';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  songHash?: string;
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

export default function CollectionModal({ isOpen, onClose, songHash: songId, onCreate }: CollectionModalProps) {
  const loc = useLoc();
  const { username } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState<0 | 1>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch(endpoints.collection.diff(collectionId), {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "hashesToAdd": [songId] }),
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
        <div className="z-9999 fixed inset-0">
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
            className="top-1/2 left-1/2 absolute flex flex-col bg-[rgba(20,20,25,0.95)] shadow-2xl border border-white/10 rounded-2xl w-[90%] max-w-md max-h-[85vh] overflow-hidden -translate-x-1/2 -translate-y-1/2"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-5 pb-3 shrink-0">
              <h2 className="font-bold text-white text-xl">{title}</h2>
              <button
                onClick={onClose}
                className="flex justify-center items-center hover:bg-white/10 rounded-full w-8 h-8 text-white/60 hover:text-white transition-colors cursor-pointer"
                aria-label={loc('Close', '关闭')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 px-5 pb-2 min-h-0 overflow-y-auto">
              {isLoading && (
                <div className="flex justify-center items-center py-16 w-full">
                  <LoadingSpinner size="36px" />
                </div>
              )}

              {!isLoading && error && (
                <div className="flex justify-center items-center py-12 w-full">
                  <p className="text-white/40 text-sm">{loc('LoadFailed', '加载失败')}</p>
                </div>
              )}

              {!isLoading && !error && !hasCollections && !isCreating && (
                <div className="flex flex-col justify-center items-center gap-3 py-12 w-full">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/15">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                  <p className="text-white/40 text-sm">{loc('NoCollections', '暂无收藏夹')}</p>
                </div>
              )}

              {hasCollections && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <svg
                      className="top-1/2 left-3 absolute text-white/30 -translate-y-1/2 pointer-events-none"
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={loc('SearchCollections', '搜索收藏夹...')}
                      className="bg-white/5 py-2.5 pr-3 pl-9 border border-white/10 focus:border-white/25 rounded-xl outline-none w-full text-white text-sm transition-colors placeholder-white/30"
                    />
                  </div>

                  {filteredCollections.length === 0 && (
                    <div className="flex justify-center items-center py-12 w-full">
                      <p className="text-white/30 text-sm">{loc('NoResults', '没有找到匹配的收藏夹')}</p>
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
                          className={`group flex items-start gap-3 rounded-xl p-3 text-left transition-colors ${songId ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
                            } ${isAdding ? 'bg-blue-500/10' : ''}`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${isAdding ? 'bg-blue-500/15' : 'bg-white/5 group-hover:bg-white/10'
                            }`}>
                            {isAdding ? (
                              <LoadingSpinner size="18px" />
                            ) : (
                              <svg
                                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="text-white/40 group-hover:text-white/60 transition-colors"
                              >
                                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white/90 text-sm truncate">
                              {collection.name || loc('UnnamedCollection', '未命名收藏夹')}
                            </div>
                            {collection.description && (
                              <div className="mt-0.5 text-white/40 text-xs truncate">{collection.description}</div>
                            )}
                          </div>

                          <div className="flex justify-center items-center bg-white/5 px-2.5 rounded-full h-6 shrink-0">
                            <span className="text-white/40 text-xs">{collection.count}</span>
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
                    <div className="space-y-3 bg-white/5 mt-3 p-4 border border-white/10 rounded-xl">
                      <div>
                        <label className="block mb-1.5 font-medium text-white/70 text-xs">
                          {loc('CollectionName', '名称')} <span className="text-red-400">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                          placeholder={loc('CollectionNamePlaceholder', '收藏夹名称')}
                          className="bg-white/5 px-3 py-2 border border-white/10 focus:border-blue-500/50 rounded-lg outline-none w-full text-white text-sm transition-colors placeholder-white/25"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 font-medium text-white/70 text-xs">
                          {loc('Description', '描述')}
                        </label>
                        <input
                          type="text"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder={loc('DescriptionPlaceholder', '描述内容（可选）')}
                          className="bg-white/5 px-3 py-2 border border-white/10 focus:border-blue-500/50 rounded-lg outline-none w-full text-white text-sm transition-colors placeholder-white/25"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 font-medium text-white/70 text-xs">
                          {loc('Visibility', '可见性')}
                        </label>
                        <select
                          value={newVisibility}
                          onChange={(e) => setNewVisibility(Number(e.target.value) as 0 | 1)}
                          className="bg-white/5 px-3 py-2 border border-white/10 focus:border-blue-500/50 rounded-lg outline-none w-full text-white text-sm transition-colors"
                        >
                          <option value={0}>{loc('Private', '私有')}</option>
                          <option value={1}>{loc('Public', '公开')}</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleCreate}
                          disabled={!newName.trim() || creatingLoading}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 py-2 rounded-lg font-medium text-white disabled:text-white/30 text-sm transition-colors disabled:cursor-not-allowed"
                        >
                          {creatingLoading ? (
                            <span className="flex justify-center items-center gap-2"><LoadingSpinner size="14px" /></span>
                          ) : (
                            loc('Create', '创建')
                          )}
                        </button>
                        <button
                          onClick={resetCreateForm}
                          disabled={creatingLoading}
                          className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 py-2 rounded-lg text-white/70 text-sm transition-colors disabled:cursor-not-allowed"
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
              <div className="px-5 py-3 border-white/5 border-t shrink-0">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex justify-center items-center gap-2 hover:bg-white/5 py-2.5 rounded-xl w-full text-white/50 hover:text-white/80 text-sm transition-colors cursor-pointer"
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
