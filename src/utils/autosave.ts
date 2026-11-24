/**
 * 自动保存：把编辑中的整份 maidata 存进 IndexedDB。
 *
 * 浏览器里没有"任意目录写文件"的权限，所以草稿只能落在 IndexedDB；
 * 它不影响 `已保存/未保存` 的语义——只有真正写回文件才算保存。
 */

const DB_NAME = 'majdata-editor';
const STORE = 'drafts';
const VERSION = 1;

export type Draft = {
  /** 整份 maidata 文本 */
  maidata: string;
  /** 写入时间（毫秒） */
  savedAt: number;
  /** 当时停在哪个难度 */
  active: number;
};

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => db.close();
  });
}

export async function readDraft(key: string): Promise<Draft | null> {
  const value = await withStore<Draft | undefined>('readonly', (store) => store.get(key) as IDBRequest<Draft | undefined>);
  return value ?? null;
}

export async function writeDraft(key: string, maidata: string, active: number): Promise<void> {
  await withStore('readwrite', (store) => store.put({ maidata, savedAt: Date.now(), active }, key) as IDBRequest<IDBValidKey>);
}

export async function clearDraft(key: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(key) as IDBRequest<undefined>);
}

/**
 * 是否该提示"恢复上次编辑"：草稿比磁盘上的文件新，且内容确实不同。
 * 单拎出来是为了能在没有 IndexedDB 的环境里测。
 */
export function shouldOfferRestore(
  draft: { maidata: string; savedAt: number } | null,
  file: { maidata: string; modifiedAt: number },
): boolean {
  if (!draft) return false;
  if (draft.maidata === file.maidata) return false;
  return draft.savedAt > file.modifiedAt;
}
