/**
 * IntroUploader 组件 - 个人简介上传器
 */

import { useTranslation } from 'react-i18next';
import SectionLoading from '@/components/ui/SectionLoading';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-dark.css';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import { getDisplayMessage } from '@/utils';
import remarkCenter from '@/utils/remarkCenter';
import type { UserInfo } from '@/types';

import { apiFetcher as fetcher } from '@/utils/apiClient';

export default function IntroUploader() {
  const { t } = useTranslation();
  const { user, refetch } = useUserContext();
  const [intro, setIntro] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<UserInfo>(
    user ? endpoints.account.profile(user.username) : null,
    fetcher
  );

  useEffect(() => {
    if (data && data.introduction) {
      setIntro(data.introduction);
    }
  }, [data]);

  if (error) {
    return undefined;
  }

  if (isLoading) {
    return <SectionLoading />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const content = formData.get('introduction') as string;

    if (!content || content.trim() === '') {
      toast.error(t("user/IntroUploader.NoIntroTypedIn"));
      return;
    }

    const uploading = toast.loading(t("user/IntroUploader.Uploading"), {
      hideProgressBar: false,
    });

    setIsUploading(true);

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
      toast.success(getDisplayMessage(response.data, t("user/IntroUploader.UploadSuccess")));
      await Promise.all([mutate(), refetch()]);
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown }; message?: string };
      const message = getDisplayMessage(error.response?.data ?? error.message, t("user/IntroUploader.UploadFailed"));
      toast.error(message, { autoClose: false });
    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }

  const paneCaption = 'mb-2 font-medium text-white/50 text-xs uppercase tracking-wider';
  const paneBox = 'border border-white/10 rounded-xl w-full h-80 lg:h-[28rem]';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* 桌面端左边编辑、右边实时预览；手机端上下排列 */}
      <div className="gap-4 grid grid-cols-1 lg:grid-cols-2 min-w-0">
        <label className="flex flex-col min-w-0">
          <span className={paneCaption}>{t("user/IntroUploader.SelfIntro")}</span>
          <textarea
            className={`${paneBox} bg-black/40 focus:bg-black/50 disabled:opacity-60 p-3.5 focus:border-blue-400/60 outline-none focus:ring-2 focus:ring-blue-400/20 font-mono text-white text-sm leading-relaxed resize-none transition-colors`}
            name="introduction"
            id="IntroBox"
            defaultValue={data?.introduction || ''}
            onChange={(e) => setIntro(e.target.value)}
            disabled={isUploading}
          />
        </label>

        <div className="flex flex-col min-w-0">
          <span className={paneCaption}>{t("user/IntroUploader.Preview")}</span>
          <article className={`${paneBox} bg-white/[0.02]! p-4 overflow-auto markdown-body`}>
            <Markdown
              remarkPlugins={[remarkGfm, remarkCenter]}
              components={{
                ol(props) {
                  return <ol type="1" {...props} />;
                },
                img(props) {
                  return <img style={{ margin: 'auto' }} {...props} />;
                },
              }}
            >
              {intro}
            </Markdown>
          </article>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-5 border-none rounded-xl h-10 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          type="submit"
          disabled={isUploading}
        >
          {isUploading ? t("user/IntroUploader.Saving") : t("user/IntroUploader.Save")}
        </button>
      </div>
    </form>
  );
}
