import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios, { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { useI18n, useUserContext } from '@/hooks';
import { getDisplayMessage, sleep } from '@/utils';
import { getFileKey, hashCandidatesFromBytes } from '@/utils/maidataHash';
import { getExpectedChartUploadFileNames, isValidChartUploadFileName } from '@/utils/chartUploadValidation';
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

export default function ChartUploader() {
  const { i18n } = useI18n();
  const { user, isLoading: isUserLoading } = useUserContext();
  const [isUploading, setIsUploading] = useState(false);
  const [hashLookup, setHashLookup] = useState<HashLookupState>({ status: 'idle' });
  const hashLookupSeq = useRef(0);
  const hashLookupAbort = useRef<AbortController | null>(null);

  async function lookupMaidataHash(file: File) {
    const fileKey = getFileKey(file);
    const seq = hashLookupSeq.current + 1;
    hashLookupSeq.current = seq;
    hashLookupAbort.current?.abort();
    const abortController = new AbortController();
    hashLookupAbort.current = abortController;

    setHashLookup({ status: 'checking', fileKey });

    try {
      if (!user) {
        const nextState: HashLookupState = {
          status: 'loginRequired',
          fileKey,
          message: isUserLoading
            ? i18n("user/ChartUploader.MaidataHashChecking", 'Checking whether this chart already exists...')
            : i18n("user/ChartUploader.NotLoggedIn", 'Not logged in'),
        };
        setHashLookup(nextState);
        return nextState;
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const hashes = hashCandidatesFromBytes(bytes);
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
          ? i18n("user/ChartUploader.NotLoggedIn", 'Not logged in')
          : getDisplayMessage(error.response?.data ?? error.message, i18n("user/ChartUploader.MaidataHashLookupFailed", 'Failed to query maidata hash')),
      };
      if (hashLookupSeq.current === seq) {
        setHashLookup(nextState);
      }
      return nextState;
    }
  }

  function resetHashLookup() {
    hashLookupSeq.current += 1;
    hashLookupAbort.current?.abort();
    setHashLookup({ status: 'idle' });
  }

  function onFileChange(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      if (index === 0) {
        resetHashLookup();
      }
      return;
    }

    if (!isValidChartUploadFileName(index, file.name)) {
      toast.error(
        i18n("user/ChartUploader.InvalidFileName", 'Invalid file name. Expected: ')
        + getExpectedChartUploadFileNames(index),
      );
      event.currentTarget.value = '';
      if (index === 0) {
        resetHashLookup();
      }
      return;
    }

    if (index === 0) {
      void lookupMaidataHash(file);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const filesNecessary = formData.getAll('formfiles');

    const fileChecks = [
      { file: filesNecessary[0], name: 'maidata.txt' },
      { file: filesNecessary[1], name: 'bg.png/bg.jpg' },
      { file: filesNecessary[2], name: 'track' },
    ];

    const missedFiles: string[] = [];

    for (const { file, name } of fileChecks) {
      const fileObj = file as File;
      if (!fileObj || fileObj.name === '' || fileObj.size === 0) {
        missedFiles.push(name);
      }
    }

    if (missedFiles.length > 0) {
      for (const file of missedFiles) {
        toast.error(i18n("user/ChartUploader.NoFileSelected") + file);
      }
      return;
    }

    for (let index = 0; index < filesNecessary.length; index += 1) {
      const file = filesNecessary[index] as File;
      // The fourth file is optional; an empty file input can appear as an empty File.
      if (!file || file.name === '' || file.size === 0) {
        continue;
      }

      if (!isValidChartUploadFileName(index, file.name)) {
        toast.error(
          i18n("user/ChartUploader.InvalidFileName", 'Invalid file name. Expected: ')
          + getExpectedChartUploadFileNames(index),
        );
        return;
      }
    }

    if (hashLookup.status === 'exists') {
      toast.error(i18n("user/ChartUploader.MaidataAlreadyExists", 'This chart already exists on the site'), { autoClose: false });
      return;
    }

    const uploading = toast.loading(i18n("user/ChartUploader.Uploading"), {
      hideProgressBar: false,
    });

    setIsUploading(true);

    try {
      const response = await axios.post(endpoints.maichart.upload, formData, {
        onUploadProgress: function (progressEvent) {
          if (progressEvent.total && progressEvent.lengthComputable) {
            const progress = progressEvent.loaded / progressEvent.total;
            toast.update(uploading, { progress });
          }
        },
        withCredentials: true,
      });
      toast.success(getDisplayMessage(response.data, i18n("user/ChartUploader.UploadSuccess", 'Upload succeeded')));
      await sleep(2000);
      window.location.reload();
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response?.status === 500) {
        toast.error(i18n("user/ChartUploader.UploadServerErrorHint"), { autoClose: false });
      }
      else {
        const error = e as { response?: { data?: unknown }; message?: string };
        const message = getDisplayMessage(error.response?.data ?? error.message, i18n("user/ChartUploader.UploadFailed", 'Upload failed'));
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
    { label: i18n("user/ChartUploader.BGVideoHint"), icon: <MdOutlineVideoFile className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
  ];
  const hashLookupStatusText: Record<HashLookupStatus, string> = {
    idle: '',
    checking: i18n("user/ChartUploader.MaidataHashChecking", 'Checking whether this chart already exists...'),
    notFound: i18n("user/ChartUploader.MaidataHashNotFound", 'No existing chart found'),
    exists: hashLookup.chart
      ? i18n("user/ChartUploader.MaidataAlreadyExistsWithTitle", 'This chart already exists on the site') + `: ${hashLookup.chart.title}`
      : i18n("user/ChartUploader.MaidataAlreadyExists", 'This chart already exists on the site'),
    inheritsHistory: i18n("user/ChartUploader.MaidataWillInheritHistory", 'This upload will inherit previous scores or interactions'),
    loginRequired: hashLookup.message || i18n("user/ChartUploader.NotLoggedIn", 'Not logged in'),
    error: hashLookup.message || i18n("user/ChartUploader.MaidataHashLookupFailed", 'Failed to query maidata hash'),
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
            {i18n("user/ChartUploader.Upload") || 'Upload Chart'}
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
                    disabled={isUploading}
                    onChange={(event) => onFileChange(index, event)}
                  />
                </div>
              </div>
            ))}
          </div>

          {hashLookup.status !== 'idle' && (
            <div className={`flex items-center gap-2 text-sm ${hashLookupStatusClass[hashLookup.status]}`}>
              {hashLookup.status === 'checking' && <LoadingSpinner className="w-4 h-4" />}
              <span>{hashLookupStatusText[hashLookup.status]}</span>
              {hashLookup.status === 'exists' && hashLookup.chart && (
                <Link
                  className="text-blue-300 hover:text-blue-200 underline"
                  to={`/song?id=${encodeURIComponent(hashLookup.chart.id)}`}
                >
                  {i18n("user/ChartUploader.View", 'View')}
                </Link>
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`mt-4 w-full py-3 rounded-xl font-bold text-gray-200 shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border border-white/5
              ${isUploading || cannotUploadByHash
                ? 'bg-red-900/50 cursor-not-allowed opacity-70'
                : 'bg-[#2e2e2e] hover:bg-[#3a3a3a] hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              }`}
            type="submit"
            disabled={isUploading || cannotUploadByHash}
          >
            {isUploading ? (
              <>
                <LoadingSpinner className="w-5 h-5 text-gray-400" />
                {i18n("user/ChartUploader.UploadingPlzWait")}
              </>
            ) : (
              <>
                <MdCloudUpload className="text-xl" />
                {i18n("user/ChartUploader.Upload")}
              </>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
