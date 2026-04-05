/**
 * AvatarUploader 组件 - 头像上传器
 * 迁移自 legacy/src/app/widgets/AvatarUploader.jsx
 */

import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { endpoints } from '@/config/api';
import { useLoc, useUser } from '@/hooks';
import { sleep } from '@/utils';
import { LoadingSpinner } from '@/components';

export default function AvatarUploader() {
  const loc = useLoc();
  const { user, isLoading: userLoading } = useUser();
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

      toast.done(uploading);
      toast.success(response.data);
      await sleep(2000);
      window.location.reload();
    } catch (e: unknown) {
      toast.done(uploading);

      const error = e as { response?: { data?: string; status?: number; statusText?: string }; message?: string };
      let errorMessage = '上传失败';
      if (error.response?.data) {
        errorMessage = error.response.data;
      } else if (error.response?.status) {
        errorMessage = `上传失败 (${error.response.status}: ${error.response.statusText})`;
      } else if (error.message) {
        errorMessage = `上传失败: ${error.message}`;
      }

      toast.error(errorMessage, { autoClose: false });
    } finally {
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
            className="shadow-[0_6px_20px_rgba(0,0,0,0.4)] border-4 border-white/20 rounded-full w-40 h-40 object-cover transition-all duration-300"
            src={currentAvatarUrl}
            alt={loc('CurrentAvatar')}
          />
          <div className="bg-white/5 px-4 py-2 border border-white/10 rounded-[20px] font-semibold text-[#b0b0b0] text-base text-center">
            {loc('CurrentAvatar')}
          </div>
        </div>

        {/* Preview Avatar */}
        <div className="flex flex-col flex-1 justify-center items-center gap-4">
          <div className="flex flex-col justify-center items-center gap-4">
            <img
              className={`w-40 h-40 rounded-full object-cover border-4 transition-all duration-300 shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${previewUrl
                  ? 'border-[rgba(59,130,246,0.8)] shadow-[0_6px_25px_rgba(59,130,246,0.5)]'
                  : 'border-white/20'
                }`}
              src={previewAvatarUrl}
              alt={loc('PreviewAvatar')}
            />
            <div className="bg-white/5 px-4 py-2 border border-white/10 rounded-[20px] font-semibold text-[#b0b0b0] text-base text-center">
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
              className="flex justify-center items-center disabled:bg-[#6b7280] bg-linear-to-br from-[#667eea] to-[#764ba2] disabled:opacity-50 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] disabled:shadow-none px-6 py-4 border-0 rounded-[10px] w-full font-bold text-white disabled:text-[#9ca3af] text-base tracking-[0.02em] disabled:transform-none transition-all hover:-translate-y-0.5 duration-300 cursor-pointer disabled:cursor-not-allowed"
              disabled={isUploading}
            >
              {selectedFile ? loc('ChangeFile') : loc('SelectFile')}
            </button>

            <button
              type="button"
              onClick={handleUpload}
              className="flex justify-center items-center disabled:bg-[#6b7280] bg-linear-to-br from-[#11998e] to-[#38ef7d] disabled:opacity-50 hover:shadow-[0_8px_25px_rgba(17,153,142,0.4)] disabled:shadow-none px-6 py-4 border-0 rounded-[10px] w-full font-bold text-white disabled:text-[#9ca3af] text-base tracking-[0.02em] disabled:transform-none transition-all hover:-translate-y-0.5 duration-300 cursor-pointer disabled:cursor-not-allowed"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? loc('UploadingPlzWait') : loc('Upload')}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="flex justify-center items-center disabled:bg-[#6b7280] bg-linear-to-br from-[#ff6b6b] to-[#ee5a24] disabled:opacity-50 hover:shadow-[0_8px_25px_rgba(255,107,107,0.4)] disabled:shadow-none px-6 py-4 border-0 rounded-[10px] w-full font-bold text-white disabled:text-[#9ca3af] text-base tracking-[0.02em] disabled:transform-none transition-all hover:-translate-y-0.5 duration-300 cursor-pointer disabled:cursor-not-allowed"
              disabled={!selectedFile || isUploading}
            >
              {loc('Cancel')}
            </button>
          </div>

          {selectedFile && (
            <div className="flex flex-col justify-center items-start gap-1 py-2 w-full max-h-15 overflow-hidden">
              <span className="w-full max-h-[2.4rem] overflow-hidden overflow-wrap-anywhere font-medium text-[#e0e0e0] text-xs text-left break-all line-clamp-2 leading-tight">
                {selectedFile.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#b0b0b0] text-[0.7rem] shrink-0">
                  {loc('FileSize')}
                </span>
                <span className="text-[#a0a0a0] text-[0.7rem] shrink-0">
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
