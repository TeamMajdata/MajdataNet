/**
 * AvatarUploader 组件 - 头像上传器
 * 迁移自 legacy/src/app/widgets/AvatarUploader.jsx
 */

import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { endpoints } from '@/config/api';
import { useLoc, useUserContext } from '@/hooks';
import { getDisplayMessage, sleep } from '@/utils';
import { LoadingSpinner } from '@/components';

export default function AvatarUploader() {
  const loc = useLoc();
  const { user, isLoading: userLoading } = useUserContext();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error(loc('InvalidFileType'));
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(loc('FileTooLarge'));
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // 设置选中的文件
      setSelectedFile(file);

      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    },
    [loc]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error(loc('NoSelectedFile'));
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('pic', selectedFile);

    const uploading = toast.loading(loc('Uploading'), {
      hideProgressBar: false,
    });

    try {
      const response = await axios.post(endpoints.account.uploadIcon, formData, {
        onUploadProgress: function (progressEvent) {
          if (progressEvent.total && progressEvent.lengthComputable) {
            const progress = progressEvent.loaded / progressEvent.total;
            toast.update(uploading, { progress });
          }
        },
        withCredentials: true,
      });

      toast.success(getDisplayMessage(response.data, loc('UploadSuccess', '上传成功')));
      await sleep(2000);
      window.location.reload();
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown; status?: number; statusText?: string }; message?: string };
      const fallbackMessage = error.response?.status
        ? `上传失败 (${error.response.status}: ${error.response.statusText || 'Unknown'})`
        : loc('UploadFailed', '上传失败');
      const errorMessage = getDisplayMessage(error.response?.data ?? error.message, fallbackMessage);
      toast.error(errorMessage, { autoClose: false });
    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }, [selectedFile, loc]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 如果用户还在加载中，返回加载状态
  if (userLoading || !user) {
    return <div className="flex justify-center items-center py-12"><LoadingSpinner size="50px" /></div>;
  }

  const currentAvatarUrl = endpoints.account.icon(user.username);
  const previewAvatarUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="w-full">
      <div className="flex items-center gap-8">
        {/* Current Avatar */}
        <div className="flex flex-col flex-[0_0_auto] justify-center items-center gap-4 h-55">
          <img
            className="shadow-card border-4 border-line rounded-full w-40 h-40 object-cover transition-all duration-300"
            src={currentAvatarUrl}
            alt={loc('CurrentAvatar')}
          />
          <div className="bg-surface-2 border border-line rounded-full px-4 py-2 font-semibold text-ink-3 text-base text-center">
            {loc('CurrentAvatar')}
          </div>
        </div>

        {/* Preview Avatar */}
        <div className="flex flex-col flex-1 justify-center items-center gap-4">
          <div className="flex flex-col justify-center items-center gap-4">
            <img
              className={`w-40 h-40 rounded-full object-cover border-4 transition-all duration-300 shadow-card ${previewUrl
                ? 'border-primary'
                : 'border-line'
                }`}
              src={previewAvatarUrl}
              alt={loc('PreviewAvatar')}
            />
            <div className="bg-surface-2 border border-line rounded-full px-4 py-2 font-semibold text-ink-3 text-base text-center">
              {loc('PreviewAvatar')}
            </div>
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col flex-[0_0_280px] justify-center items-stretch gap-6 h-55">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={triggerFileSelect}
              className="flex justify-center items-center disabled:bg-surface-2 disabled:text-ink-3 disabled:cursor-not-allowed bg-primary hover:bg-primary-hover px-6 py-4 border-0 rounded-md w-full font-bold text-white text-base transition-colors cursor-pointer"
              disabled={isUploading}
            >
              {selectedFile ? loc('ChangeFile') : loc('SelectFile')}
            </button>

            <button
              type="button"
              onClick={handleUpload}
              className="flex justify-center items-center disabled:bg-surface-2 disabled:text-ink-3 disabled:cursor-not-allowed bg-ok hover:bg-ok/85 px-6 py-4 border-0 rounded-md w-full font-bold text-white text-base transition-colors cursor-pointer"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? loc('UploadingPlzWait') : loc('Upload')}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="flex justify-center items-center disabled:bg-surface-2 disabled:text-ink-3 disabled:cursor-not-allowed bg-danger hover:bg-danger/85 px-6 py-4 border-0 rounded-md w-full font-bold text-white text-base transition-colors cursor-pointer"
              disabled={!selectedFile || isUploading}
            >
              {loc('Cancel')}
            </button>
          </div>

          {selectedFile && (
            <div className="flex flex-col justify-center items-start gap-1 py-2 w-full max-h-15 overflow-hidden">
              <span className="w-full max-h-[2.4rem] overflow-hidden overflow-wrap-anywhere font-medium text-ink text-xs text-left break-all line-clamp-2 leading-tight">
                {selectedFile.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-3 text-[0.7rem] shrink-0">
                  {loc('FileSize')}
                </span>
                <span className="text-ink-3 text-[0.7rem] shrink-0">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .w-full > div:first-child {
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
          }
          .w-full > div:first-child > div:first-child {
            height: auto;
            justify-content: flex-start;
          }
          .w-full > div:first-child > div:nth-child(2) {
            height: 180px;
          }
          .w-full > div:first-child img {
            width: 120px;
            height: 120px;
          }
          .w-full > div:first-child > div:last-child {
            flex: none;
            max-width: 300px;
            height: auto;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
