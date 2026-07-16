import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios, { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { useLoc, useUserContext } from '@/hooks';
import { getDisplayMessage, sleep } from '@/utils';
import { getFileKey, hashCandidatesFromBytes } from '@/utils/maidataHash';
import {
  validateMaidataBytes,
  type MaidataValidationResult,
  type RequiredMaidataMetadata,
} from '@/utils/maidataValidation';
import { motion } from 'framer-motion';
import { MdOutlineAudioFile, MdOutlineDescription, MdOutlineImage, MdOutlineVideoFile, MdCloudUpload } from 'react-icons/md';
import { LoadingSpinner } from '@/components';
import type { Song } from '@/types';

type HashLookupStatus = 'idle' | 'checking' | 'notFound' | 'exists' | 'inheritsHistory' | 'loginRequired' | 'error';

interface HashLookupState {
  status: HashLookupStatus;
  fileKey?: string;
  hash?: string;
  chart?: Song;
  message?: string;
}

interface HashStatusResponse {
  exists?: boolean;
  hasHistoricalScores?: boolean;
  hasHistoricalInteract?: boolean;
  chart?: Song | null;
}

type MaidataValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'readError' | 'fileChanged';

interface MaidataValidationState {
  status: MaidataValidationStatus;
  fileKey?: string;
  result?: MaidataValidationResult;
  contentHash?: string;
}

const metadataErrorKeys: Record<RequiredMaidataMetadata, string> = {
  title: 'MaidataTitleMissingOrEmpty',
  artist: 'MaidataArtistMissingOrEmpty',
  des: 'MaidataDesignerMissingOrEmpty',
};

const metadataErrorFallbacks: Record<RequiredMaidataMetadata, string> = {
  title: '歌曲名(&title)缺失或为空',
  artist: '艺术家(&artist)缺失或为空',
  des: '谱师(&des)缺失或为空',
};

export default function ChartUploader() {
  const loc = useLoc();
  const { user, isLoading: isUserLoading } = useUserContext();
  const [isUploading, setIsUploading] = useState(false);
  const [hashLookup, setHashLookup] = useState<HashLookupState>({ status: 'idle' });
  const [maidataValidation, setMaidataValidation] = useState<MaidataValidationState>({ status: 'idle' });
  const hashLookupSeq = useRef(0);
  const hashLookupAbort = useRef<AbortController | null>(null);
  const maidataInputRef = useRef<HTMLInputElement | null>(null);
  const maidataFileBeforePicker = useRef<File | null>(null);

  useEffect(() => {
    const input = maidataInputRef.current;
    if (!input) {
      return;
    }

    // 取消文件选择时，恢复选中之前已选的maidata
    const handleCancel = () => {
      const previousFile = maidataFileBeforePicker.current;
      maidataFileBeforePicker.current = null;

      if (!previousFile || typeof DataTransfer === 'undefined') {
        return;
      }

      try {
        const transfer = new DataTransfer();
        transfer.items.add(previousFile);
        input.files = transfer.files;
      } catch {
        hashLookupSeq.current += 1;
        hashLookupAbort.current?.abort();
        setMaidataValidation({ status: 'idle' });
        setHashLookup({ status: 'idle' });
      }
    };

    input.addEventListener('cancel', handleCancel);
    return () => input.removeEventListener('cancel', handleCancel);
  }, []);

  function getMaidataValidationMessages(state: MaidataValidationState) {
    if (state.status === 'fileChanged') {
      return [loc('MaidataFileChanged', 'maidata.txt was modified after it was selected. Please select the file again.')];
    }

    if (state.status === 'readError') {
      return [loc('MaidataFileReadFailed', 'Failed to read maidata.txt. Please select the file again.')];
    }

    if (state.status !== 'invalid' || !state.result) {
      return [];
    }

    if (state.result.empty) {
      return [loc('MaidataFileEmpty', 'maidata.txt cannot be empty')];
    }

    return state.result.missingOrEmptyMetadata.map((key) =>
      loc(metadataErrorKeys[key], metadataErrorFallbacks[key]),
    );
  }

  function showMaidataValidationToasts(state: MaidataValidationState) {
    for (const message of getMaidataValidationMessages(state)) {
      toast.error(message, { autoClose: false });
    }
  }

  async function inspectMaidata(file: File, showValidationToast = false) {
    const fileKey = getFileKey(file);
    const seq = hashLookupSeq.current + 1;
    hashLookupSeq.current = seq;
    hashLookupAbort.current?.abort();
    const abortController = new AbortController();
    hashLookupAbort.current = abortController;

    setMaidataValidation({ status: 'checking', fileKey });
    setHashLookup({ status: 'idle' });

    let bytes: Uint8Array;
    let validationResult: MaidataValidationResult;

    try {
      bytes = new Uint8Array(await file.arrayBuffer());
      validationResult = validateMaidataBytes(bytes);
    } catch {
      if (hashLookupSeq.current === seq) {
        const nextState: MaidataValidationState = { status: 'readError', fileKey };
        setMaidataValidation(nextState);
        setHashLookup({ status: 'idle' });
        if (showValidationToast) {
          showMaidataValidationToasts(nextState);
        }
      }
      return;
    }

    if (hashLookupSeq.current !== seq) {
      return;
    }

    if (!validationResult.valid) {
      const nextState: MaidataValidationState = {
        status: 'invalid',
        fileKey,
        result: validationResult,
      };
      setMaidataValidation(nextState);
      if (showValidationToast) {
        showMaidataValidationToasts(nextState);
      }
      return;
    }

    const hashes = hashCandidatesFromBytes(bytes);
    setMaidataValidation({
      status: 'valid',
      fileKey,
      result: validationResult,
      contentHash: hashes[0],
    });

    if (!user) {
      setHashLookup({
        status: 'loginRequired',
        fileKey,
        message: isUserLoading
          ? loc('MaidataHashChecking', 'Checking whether this chart already exists...')
          : loc('NotLoggedIn', 'Not logged in'),
      });
      return;
    }

    setHashLookup({ status: 'checking', fileKey });

    try {
      let inheritedState: HashLookupState | null = null;

      for (const hash of hashes) {
        const response = await axios.get<HashStatusResponse>(endpoints.maichart.hashStatus(hash), {
          withCredentials: true,
          signal: abortController.signal,
        });
        const exists = response.data.exists;
        const hasHistoricalScores = response.data.hasHistoricalScores;
        const hasHistoricalInteract = response.data.hasHistoricalInteract;
        const chart = response.data.chart ?? undefined;
        const result: Pick<HashLookupState, 'status' | 'chart'> | null = exists
          ? { status: 'exists', chart }
          : hasHistoricalScores || hasHistoricalInteract
            ? { status: 'inheritsHistory' }
            : null;

        if (result) {
          const nextState: HashLookupState = {
            status: result.status,
            fileKey,
            hash,
            chart: result.chart,
          };
          if (nextState.status === 'inheritsHistory') {
            inheritedState ??= nextState;
            continue;
          }

          if (hashLookupSeq.current === seq) {
            setHashLookup(nextState);
          }
          return nextState;
        }
      }

      if (inheritedState) {
        if (hashLookupSeq.current === seq) {
          setHashLookup(inheritedState);
        }
        return inheritedState;
      }

      const nextState: HashLookupState = { status: 'notFound', fileKey };
      if (hashLookupSeq.current === seq) {
        setHashLookup(nextState);
      }
      return nextState;
    } catch (e: unknown) {
      if (axios.isCancel(e) || (e instanceof AxiosError && e.code === 'ERR_CANCELED')) {
        return { status: 'checking', fileKey } satisfies HashLookupState;
      }

      const error = e as { response?: { data?: unknown }; message?: string };
      const isUnauthorized = e instanceof AxiosError && e.response?.status === 401;
      const nextState: HashLookupState = {
        status: isUnauthorized ? 'loginRequired' : 'error',
        fileKey,
        message: isUnauthorized
          ? loc('NotLoggedIn', 'Not logged in')
          : getDisplayMessage(error.response?.data ?? error.message, loc('MaidataHashLookupFailed', 'Failed to query maidata hash')),
      };
      if (hashLookupSeq.current === seq) {
        setHashLookup(nextState);
      }
      return nextState;
    }
  }

  function resetMaidataInspection() {
    hashLookupSeq.current += 1;
    hashLookupAbort.current?.abort();
    setMaidataValidation({ status: 'idle' });
    setHashLookup({ status: 'idle' });
  }

  function onFileChange(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    if (index !== 0) {
      return;
    }

    maidataFileBeforePicker.current = null;
    const file = event.currentTarget.files?.[0];
    if (!file) {
      resetMaidataInspection();
      return;
    }

    void inspectMaidata(file);
  }

  function onFileInputClick(index: number, event: React.MouseEvent<HTMLInputElement>) {
    if (index !== 0 || event.currentTarget.value === '' || typeof DataTransfer === 'undefined') {
      return;
    }

    // 将上次选中的文件暂存到另一对象，并清空当前控件value，使再次选择同一文件也会触发change重新校验maidata
    maidataFileBeforePicker.current = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
  }

  function markMaidataFileChanged(fileKey: string) {
    hashLookupSeq.current += 1;
    hashLookupAbort.current?.abort();
    const nextState: MaidataValidationState = { status: 'fileChanged', fileKey };
    setMaidataValidation(nextState);
    setHashLookup({ status: 'idle' });
    showMaidataValidationToasts(nextState);
  }

  async function createStableMaidataFile(file: File) {
    let bytes: Uint8Array;

    try {
      // 上传前重新读取磁盘文件，用于识别选择后被修改的文件。
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      markMaidataFileChanged(getFileKey(file));
      return null;
    }

    const contentHash = hashCandidatesFromBytes(bytes)[0];
    if (!maidataValidation.contentHash || contentHash !== maidataValidation.contentHash) {
      markMaidataFileChanged(getFileKey(file));
      return null;
    }

    // 使用内存副本上传，避免读取完成后源文件再次变化导致 ERR_UPLOAD_FILE_CHANGED。
    const stableBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(stableBuffer).set(bytes);
    return new File([stableBuffer], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const filesNecessary = formData.getAll('formfiles');

    const fileChecks = [
      { file: filesNecessary[0], name: 'maidata.txt', checkSize: false },
      { file: filesNecessary[1], name: 'bg.png/bg.jpg', checkSize: true },
      { file: filesNecessary[2], name: 'track', checkSize: true },
    ];

    const missedFiles: string[] = [];

    for (const { file, name, checkSize } of fileChecks) {
      const fileObj = file as File;
      if (!fileObj || fileObj.name === '' || (checkSize && fileObj.size === 0)) {
        missedFiles.push(name);
      }
    }

    if (missedFiles.length > 0) {
      for (const file of missedFiles) {
        toast.error(loc('NoFileSelected') + file);
      }
      return;
    }

    const maidataFile = filesNecessary[0] as File;
    const maidataFileKey = getFileKey(maidataFile);
    const validationMatchesFile = maidataValidation.fileKey === maidataFileKey;

    if (
      validationMatchesFile
      && (
        maidataValidation.status === 'invalid'
        || maidataValidation.status === 'readError'
        || maidataValidation.status === 'fileChanged'
      )
    ) {
      showMaidataValidationToasts(maidataValidation);
      return;
    }

    if (!validationMatchesFile || maidataValidation.status !== 'valid') {
      await inspectMaidata(maidataFile, true);
      return;
    }

    if (hashLookup.status === 'exists') {
      toast.error(loc('MaidataAlreadyExists', 'This chart already exists on the site'), { autoClose: false });
      return;
    }

    const stableMaidataFile = await createStableMaidataFile(maidataFile);
    if (!stableMaidataFile) {
      return;
    }

    const uploadFormData = new FormData();
    let formfileIndex = 0;
    for (const [key, value] of formData.entries()) {
      if (key === 'formfiles' && formfileIndex++ === 0) {
        uploadFormData.append(key, stableMaidataFile);
      } else {
        uploadFormData.append(key, value);
      }
    }

    const uploading = toast.loading(loc('Uploading'), {
      hideProgressBar: false,
    });

    setIsUploading(true);

    try {
      const response = await axios.post(endpoints.maichart.upload, uploadFormData, {
        onUploadProgress: function (progressEvent) {
          if (progressEvent.total && progressEvent.lengthComputable) {
            const progress = progressEvent.loaded / progressEvent.total;
            toast.update(uploading, { progress });
          }
        },
        withCredentials: true,
      });
      toast.success(getDisplayMessage(response.data, loc('UploadSuccess', 'Upload succeeded')));
      await sleep(2000);
      window.location.reload();
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response?.status === 500) {
        toast.error(loc('500UploadErrorAndHint'), { autoClose: false });
      }
      else {
        const error = e as { response?: { data?: unknown }; message?: string };
        const message = getDisplayMessage(error.response?.data ?? error.message, loc('UploadFailed', 'Upload failed'));
        toast.error(message, { autoClose: false });
      }

    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }

  const uploadFields = [
    { label: 'maidata.txt', icon: <MdOutlineDescription className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
    { label: 'bg.png/bg.jpg', icon: <MdOutlineImage className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
    { label: 'track.mp3', icon: <MdOutlineAudioFile className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
    { label: loc('BGVideoHint'), icon: <MdOutlineVideoFile className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
  ];
  const hashLookupStatusText: Record<HashLookupStatus, string> = {
    idle: '',
    checking: loc('MaidataHashChecking', 'Checking whether this chart already exists...'),
    notFound: loc('MaidataHashNotFound', 'No existing chart found'),
    exists: hashLookup.chart
      ? loc('MaidataAlreadyExistsWithTitle', 'This chart already exists on the site') + `: ${hashLookup.chart.title}`
      : loc('MaidataAlreadyExists', 'This chart already exists on the site'),
    inheritsHistory: loc('MaidataWillInheritHistory', 'This upload will inherit previous scores or interactions'),
    loginRequired: hashLookup.message || loc('NotLoggedIn', 'Not logged in'),
    error: hashLookup.message || loc('MaidataHashLookupFailed', 'Failed to query maidata hash'),
  };
  const hashLookupStatusClass: Record<HashLookupStatus, string> = {
    idle: '',
    checking: 'text-blue-300',
    notFound: 'text-emerald-300',
    exists: 'text-red-300',
    inheritsHistory: 'text-amber-300',
    loginRequired: 'text-red-300',
    error: 'text-red-300',
  };
  const maidataValidationMessages = getMaidataValidationMessages(maidataValidation);
  const cannotUploadByValidation = maidataValidation.status === 'checking'
    || maidataValidation.status === 'invalid'
    || maidataValidation.status === 'readError'
    || maidataValidation.status === 'fileChanged';
  const cannotUploadByHash = hashLookup.status === 'checking' || hashLookup.status === 'exists' || hashLookup.status === 'loginRequired';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto px-4 py-8 w-full max-w-4xl"
    >
      <div className="bg-[rgba(20,20,20,0.8)] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md p-6 md:p-8 border border-white/10 rounded-xl">

        <div className="flex items-center gap-3 mb-6 pb-4 border-white/10 border-b">
          <div className="bg-white/5 p-2 rounded-lg">
            <MdCloudUpload className="text-gray-200 text-2xl" />
          </div>
          <h2 className="font-bold text-gray-200 text-xl">
            {loc('Upload') || 'Upload Chart'}
          </h2>
        </div>

        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {uploadFields.map((field, index) => (
              <div key={index} className="group">
                <label className="flex items-center gap-2 mb-2 font-medium text-gray-400 group-hover:text-gray-200 text-sm transition-colors duration-200">
                  {field.icon}
                  {field.label}
                </label>
                <div className="relative bg-[rgba(0,0,0,0.3)] border border-white/10 group-hover:border-white/30 rounded-lg overflow-hidden transition-all duration-200">
                  <input
                    className="bg-transparent hover:file:bg-white/20 file:bg-white/10 file:mr-4 px-4 file:px-3 py-3 file:py-1.5 file:border-0 file:rounded-md focus:outline-none w-full file:font-semibold text-gray-300 hover:file:text-white file:text-gray-300 file:text-xs text-sm transition-colors cursor-pointer"
                    type="file"
                    name="formfiles"
                    ref={index === 0 ? maidataInputRef : undefined}
                    disabled={isUploading}
                    onClick={index === 0 ? (event) => onFileInputClick(index, event) : undefined}
                    onChange={(event) => onFileChange(index, event)}
                  />
                </div>
              </div>
            ))}
          </div>

          {maidataValidationMessages.length > 0 && (
            <div className="space-y-1 text-red-300 text-sm">
              {maidataValidationMessages.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          )}

          {hashLookup.status !== 'idle' && (
            <div className={`flex items-center gap-2 text-sm ${hashLookupStatusClass[hashLookup.status]}`}>
              {hashLookup.status === 'checking' && <LoadingSpinner className="w-4 h-4" />}
              <span>{hashLookupStatusText[hashLookup.status]}</span>
              {hashLookup.status === 'exists' && hashLookup.chart && (
                <Link
                  className="text-blue-300 hover:text-blue-200 underline"
                  to={`/song?id=${encodeURIComponent(hashLookup.chart.id)}`}
                >
                  {loc('View', 'View')}
                </Link>
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`mt-4 w-full py-3 rounded-xl font-bold text-gray-200 shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border border-white/5
              ${isUploading || cannotUploadByValidation || cannotUploadByHash
                ? 'bg-red-900/50 cursor-not-allowed opacity-70'
                : 'bg-[#2e2e2e] hover:bg-[#3a3a3a] hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              }`}
            type="submit"
            disabled={isUploading || cannotUploadByValidation || cannotUploadByHash}
          >
            {isUploading ? (
              <>
                <LoadingSpinner className="w-5 h-5 text-gray-400" />
                {loc('UploadingPlzWait')}
              </>
            ) : (
              <>
                <MdCloudUpload className="text-xl" />
                {loc('Upload')}
              </>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

