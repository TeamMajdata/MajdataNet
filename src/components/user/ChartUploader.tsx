import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios, { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import { getDisplayMessage, sleep } from '@/utils';
import { getFileKey, hashCandidatesFromBytes } from '@/utils/maidataHash';
import {
  buildChartUploadFormData,
  CHART_UPLOAD_FILE_RULES,
  getChartUploadAccept,
  getChartUploadFormatHint,
  isChartUploadFileFormatAccepted,
} from '@/utils/chartUploadValidation';
import { LuFileAudio, LuFileText, LuFileVideo, LuImage, LuUpload } from 'react-icons/lu';
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
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useUserContext();
  const [isUploading, setIsUploading] = useState(false);
  const [hashLookup, setHashLookup] = useState<HashLookupState>({ status: 'idle' });
  const hashLookupSeq = useRef(0);
  const hashLookupAbort = useRef<AbortController | null>(null);
  /** 每个槽位当前选中的文件；提交时按槽位顺序改写文件名后放进 FormData */
  const [picked, setPicked] = useState<(File | null)[]>([null, null, null, null]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const setPickedAt = (index: number, file: File | null) => setPicked((prev) => prev.map((value, i) => (i === index ? file : value)));

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
            ? t("user/ChartUploader.MaidataHashChecking")
            : t("user/ChartUploader.NotLoggedIn"),
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
          ? t("user/ChartUploader.NotLoggedIn")
          : getDisplayMessage(error.response?.data ?? error.message, t("user/ChartUploader.MaidataHashLookupFailed")),
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
    setPickedAt(index, null);
    if (!file) {
      if (index === 0) {
        resetHashLookup();
      }
      return;
    }

    if (!isChartUploadFileFormatAccepted(index, file.name)) {
      toast.error(
        t("user/ChartUploader.InvalidFileFormat", { formats: getChartUploadFormatHint(index) }),
      );
      event.currentTarget.value = '';
      if (index === 0) {
        resetHashLookup();
      }
      return;
    }

    setPickedAt(index, file);
    if (index === 0) {
      void lookupMaidataHash(file);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isMissing = (file: File | null) => !file || file.size === 0;
    const missedFiles = CHART_UPLOAD_FILE_RULES
      .filter((rule, index) => rule.required && isMissing(picked[index]))
      .map((rule) => rule.label);

    if (missedFiles.length > 0) {
      for (const file of missedFiles) {
        toast.error(t("user/ChartUploader.NoFileSelected", { file }));
      }
      return;
    }

    for (const [index, file] of picked.entries()) {
      if (!file || isMissing(file)) continue;

      if (!isChartUploadFileFormatAccepted(index, file.name)) {
        toast.error(
          t("user/ChartUploader.InvalidFileFormat", { formats: getChartUploadFormatHint(index) }),
        );
        return;
      }
    }

    // 用户文件名不参与上传：这里统一改写成接口约定的标准文件名
    const formData = buildChartUploadFormData(picked);

    if (hashLookup.status === 'exists') {
      toast.error(t("user/ChartUploader.MaidataAlreadyExists"), { autoClose: false });
      return;
    }

    const uploading = toast.loading(t("user/ChartUploader.Uploading"), {
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
      toast.success(getDisplayMessage(response.data, t("user/ChartUploader.UploadSuccess")));
      await sleep(2000);
      window.location.reload();
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response?.status === 500) {
        toast.error(t("user/ChartUploader.UploadServerErrorHint"), { autoClose: false });
      }
      else {
        const error = e as { response?: { data?: unknown }; message?: string };
        const message = getDisplayMessage(error.response?.data ?? error.message, t("user/ChartUploader.UploadFailed"));
        toast.error(message, { autoClose: false });
      }

    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }

  const uploadFieldIcons = [LuFileText, LuImage, LuFileAudio, LuFileVideo];
  const uploadFields = CHART_UPLOAD_FILE_RULES.map((rule, index) => ({
    label: rule.label,
    Icon: uploadFieldIcons[index],
    accept: getChartUploadAccept(index),
    hint: index === 3 ? t("user/ChartUploader.VideoHint") : undefined,
  }));
  const hashLookupStatusText: Record<HashLookupStatus, string> = {
    idle: '',
    checking: t("user/ChartUploader.MaidataHashChecking"),
    notFound: t("user/ChartUploader.MaidataHashNotFound"),
    exists: hashLookup.chart
      ? t("user/ChartUploader.MaidataAlreadyExistsWithTitle", { title: hashLookup.chart.title })
      : t("user/ChartUploader.MaidataAlreadyExists"),
    inheritsHistory: t("user/ChartUploader.MaidataWillInheritHistory"),
    loginRequired: hashLookup.message || t("user/ChartUploader.NotLoggedIn"),
    error: hashLookup.message || t("user/ChartUploader.MaidataHashLookupFailed"),
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
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        {uploadFields.map(({ label, Icon, accept, hint }, index) => {
          const file = picked[index];
          return (
            <div
              key={label}
              className={`flex items-center gap-3 p-2.5 border rounded-xl transition-colors ${file ? 'bg-emerald-400/[0.05] border-emerald-400/30' : 'bg-white/[0.02] border-white/10'}`}
            >
              <span className={`place-items-center grid rounded-lg w-9 h-9 shrink-0 ${file ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.06] text-white/55'}`}>
                <Icon aria-hidden="true" className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 min-w-0 font-medium text-white/90 text-sm">
                  <span className="whitespace-nowrap">{label}</span>
                  {hint && <span className="font-normal text-white/40 text-xs truncate">{hint}</span>}
                </div>
                <div className={`text-xs truncate ${file ? 'text-emerald-200/80' : 'text-white/35'}`}>
                  {file ? `${file.name} · ${formatSize(file.size)}` : t("user/ChartUploader.NoFileChosen")}
                </div>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => inputRefs.current[index]?.click()}
                className="bg-white/[0.06] hover:bg-white/10 disabled:opacity-50 px-3 border border-white/10 hover:border-white/20 rounded-lg h-8 font-medium text-white/85 text-xs whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {file ? t("user/ChartUploader.ReplaceFile") : t("user/ChartUploader.ChooseFile")}
              </button>
              <input
                ref={(element) => { inputRefs.current[index] = element; }}
                className="hidden"
                type="file"
                name="formfiles"
                accept={accept}
                aria-label={label}
                disabled={isUploading}
                onChange={(event) => onFileChange(index, event)}
              />
            </div>
          );
        })}
      </div>

      {hashLookup.status !== 'idle' && (
        <div className={`flex items-center gap-2 bg-white/[0.03] px-3 py-2 rounded-lg text-xs ${hashLookupStatusClass[hashLookup.status]}`}>
          {hashLookup.status === 'checking' && <LoadingSpinner size={16} />}
          <span className="min-w-0">{hashLookupStatusText[hashLookup.status]}</span>
          {hashLookup.status === 'exists' && hashLookup.chart && (
            <Link
              className="text-blue-300 hover:text-blue-200 underline shrink-0"
              to={`/song?id=${encodeURIComponent(hashLookup.chart.id)}`}
            >
              {t("user/ChartUploader.View")}
            </Link>
          )}
        </div>
      )}

      <button
        className="flex justify-center items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 border-none rounded-xl w-full h-11 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
        type="submit"
        disabled={isUploading || cannotUploadByHash}
      >
        {isUploading ? (
          <>
            <LoadingSpinner size={16} />
            {t("user/ChartUploader.UploadingPlzWait")}
          </>
        ) : (
          <>
            <LuUpload aria-hidden="true" className="w-4 h-4" />
            {t("user/ChartUploader.Upload")}
          </>
        )}
      </button>
    </form>
  );
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
