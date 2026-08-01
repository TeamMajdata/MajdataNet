/**
 * IntroUploader 组件 - 个人简介上传器
 * 迁移自 legacy/src/app/widgets/IntroUploader.jsx
 */

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-dark.css';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { useI18n, useUserContext } from '@/hooks';
import { getDisplayMessage, sleep } from '@/utils';
import remarkCenter from '@/utils/remarkCenter';
import { LoadingSpinner } from '@/components';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function IntroUploader() {
  const { i18n } = useI18n();
  const { user } = useUserContext();
  const [intro, setIntro] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data, error, isLoading } = useSWR(
    user ? endpoints.account.intro(user.username) : null,
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
    return <div className="flex justify-center items-center h-50"><LoadingSpinner size="50px" /></div>;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const content = formData.get('content') as string;

    if (!content || content.trim() === '') {
      toast.error(i18n("user/IntroUploader.NoIntroTypedIn"));
      return;
    }

    const uploading = toast.loading(i18n("user/IntroUploader.Uploading"), {
      hideProgressBar: false,
    });

    setIsUploading(true);

    try {
      const response = await axios.post(endpoints.account.uploadIntro, formData, {
        onUploadProgress: function (progressEvent) {
          if (progressEvent.total && progressEvent.lengthComputable) {
            const progress = progressEvent.loaded / progressEvent.total;
            toast.update(uploading, { progress });
          }
        },
        withCredentials: true,
      });
      toast.success(getDisplayMessage(response.data, i18n("user/IntroUploader.UploadSuccess", 'Upload succeeded')));
      await sleep(2000);
      window.location.reload();
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown }; message?: string };
      const message = getDisplayMessage(error.response?.data ?? error.message, i18n("user/IntroUploader.UploadFailed", 'Upload failed'));
      toast.error(message, { autoClose: false });
    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }

  return (
    <>
      <h2 className="mb-4 font-semibold text-[#e5e5e5] text-2xl">
        {i18n("user/IntroUploader.SelfIntro")}
        {i18n("user/IntroUploader.MarkdownSupported")}
      </h2>
      <div className="flex flex-wrap justify-center max-w-(--container-max-width) mx-auto my-0 px-(--container-padding)">
        <form className="flex flex-col justify-center w-full" onSubmit={onSubmit}>
          <textarea
            className="bg-black shadow-[2px_2px_5px_gray] focus:shadow-[0_0_8px_rgba(0,123,255,0.5)] mx-2.5 my-2.5 px-3 py-3 border border-white focus:border-[#007bff] rounded-[10px] focus:outline-none min-h-75 font-['Consolas',monospace] text-white text-sm leading-relaxed caret-white resize-vertical"
            name="content"
            id="IntroBox"
            defaultValue={data?.introduction || ''}
            onChange={(e) => setIntro(e.target.value)}
            disabled={isUploading}
          />

          <button
            className="hover:bg-[rgb(46,46,46)] disabled:bg-[rgb(92,0,0)] hover:shadow-[2px_2px_5px_gray] mx-2.5 my-7.5 px-1.5 py-1.5 border border-transparent hover:border-white rounded-[10px] text-[gainsboro] hover:text-white transition-all duration-200"
            type="submit"
            disabled={isUploading}
          >
            {isUploading ? i18n("user/IntroUploader.UploadingPlzWait") : i18n("user/IntroUploader.Upload")}
          </button>
        </form>
      </div>

      {/* HR Divider */}
      <div className="my-8 border-white/20 border-t"></div>

      <h2 className="mb-4 font-semibold text-[#e5e5e5] text-2xl">{i18n("user/IntroUploader.Preview")}</h2>
      <article className="bg-transparent px-4 markdown-body">
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
    </>
  );
}
