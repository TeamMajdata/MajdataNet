/**
 * AvatarUploader 组件 - 头像上传器
 * 迁移自 legacy/src/app/widgets/AvatarUploader.jsx
 */

import { useTranslation } from 'react-i18next';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { getDisplayMessage } from '@/utils';
import { LoadingSpinner } from '@/components';
import { LuCamera, LuUpload } from 'react-icons/lu';

const PRIMARY_BUTTON = 'inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-4 border-none rounded-xl h-10 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed';
const GHOST_BUTTON = 'inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/10 disabled:opacity-50 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/90 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed';

export default function AvatarUploader() {
  const { t } = useTranslation();
  const { user, refetch, isLoading: userLoading } = useUserContext();
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
        toast.error(t("user/AvatarUploader.InvalidFileType"));
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("user/AvatarUploader.FileTooLarge"));
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
    [t]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error(t("user/AvatarUploader.NoSelectedFile"));
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', selectedFile);

    const uploading = toast.loading(t("user/AvatarUploader.Uploading"), {
      hideProgressBar: false,
    });

    try {
      const response = await axios.post(endpoints.account.updateProfile, formData, {
        onUploadProgress: function (progressEvent) {
          if (progressEvent.total && progressEvent.lengthComputable) {
            const progress = progressEvent.loaded / progressEvent.total;
            toast.update(uploading, { progress });
          }
        },
        withCredentials: true,
      });

      toast.success(getDisplayMessage(response.data, t("user/AvatarUploader.UploadSuccess")));
      await refetch();
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown; status?: number; statusText?: string }; message?: string };
      const fallbackMessage = error.response?.status
        ? `上传失败 (${error.response.status}: ${error.response.statusText || 'Unknown'})`
        : t("user/AvatarUploader.UploadFailed");
      const errorMessage = getDisplayMessage(error.response?.data ?? error.message, fallbackMessage);
      toast.error(errorMessage, { autoClose: false });
    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }, [selectedFile, t, refetch]);

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

  // hook 必须在提前返回之前调用
  const currentAvatarUrl = useAvatarUrl(user?.username, user?.avatarId) ?? undefined;

  // 如果用户还在加载中，返回加载状态
  if (userLoading || !user) {
    return <div className="flex justify-center items-center py-12"><LoadingSpinner size="50px" /></div>;
  }

  const previewAvatarUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex sm:flex-row flex-col sm:items-center gap-4 sm:gap-5">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* 点头像选图；选中后直接显示预览，蓝色描边表示尚未上传 */}
      <button
        type="button"
        onClick={triggerFileSelect}
        disabled={isUploading}
        aria-label={t("user/AvatarUploader.SelectFile")}
        className={`group relative p-0 rounded-full w-24 h-24 overflow-hidden shrink-0 border-2 bg-white/5 cursor-pointer disabled:cursor-not-allowed transition-colors ${previewUrl ? 'border-blue-400' : 'border-white/15 hover:border-white/30'}`}
      >
        <img
          className="w-full h-full object-cover"
          src={previewAvatarUrl}
          alt={previewUrl ? t("user/AvatarUploader.PreviewAvatar") : t("user/AvatarUploader.CurrentAvatar")}
        />
        <span className="absolute inset-0 flex justify-center items-center bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <LuCamera aria-hidden="true" className="w-6 h-6 text-white" />
        </span>
      </button>

      <div className="flex flex-col gap-2.5 min-w-0">
        {selectedFile ? (
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <span className="text-white/85 truncate">{selectedFile.name}</span>
            <span className="text-white/45 shrink-0">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        ) : (
          <div className="text-white/50 text-sm">{t("user/AvatarUploader.CurrentAvatar")}</div>
        )}
        <div className="flex flex-wrap gap-2">
          {selectedFile ? (
            <>
              <button type="button" onClick={handleUpload} disabled={isUploading} className={PRIMARY_BUTTON}>
                {isUploading ? t("user/AvatarUploader.UploadingPlzWait") : t("user/AvatarUploader.Upload")}
              </button>
              <button type="button" onClick={triggerFileSelect} disabled={isUploading} className={GHOST_BUTTON}>
                {t("user/AvatarUploader.ChangeFile")}
              </button>
              <button type="button" onClick={handleCancel} disabled={isUploading} className={GHOST_BUTTON}>
                {t("user/AvatarUploader.Cancel")}
              </button>
            </>
          ) : (
            <button type="button" onClick={triggerFileSelect} className={GHOST_BUTTON}>
              <LuUpload aria-hidden="true" className="w-4 h-4" />
              {t("user/AvatarUploader.SelectFile")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
