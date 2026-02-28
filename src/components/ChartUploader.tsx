/**
 * ChartUploader 组件 - 谱面上传器
 * 迁移自 legacy/src/app/widgets/ChartUploader.jsx
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { apiroot3 } from '@/config/api';
import { useLoc } from '@/hooks';
import { sleep } from '@/utils';

export default function ChartUploader() {
  const loc = useLoc();
  const [isUploading, setIsUploading] = useState(false);

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
        toast.error(loc('NoFileSelected') + file);
      }
      return;
    }

    const uploading = toast.loading(loc('Uploading'), {
      hideProgressBar: false,
    });

    setIsUploading(true);

    try {
      const response = await axios.post(apiroot3 + '/maichart/upload', formData, {
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
      const error = e as { response?: { data?: string }; message?: string };
      toast.error(error.response?.data || error.message || 'Upload failed', { autoClose: false });
    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }

  const uploadFields = [
    { label: 'maidata.txt'},
    { label: 'bg.png/bg.jpg' },
    { label: 'track.mp3' },
    { label: loc('BGVideoHint') },
  ];

  return (
    <div className="flex flex-wrap justify-center max-w-(--container-max-width) mx-auto my-0 px-(--container-padding)">
      <form className="flex flex-col justify-center w-full" onSubmit={onSubmit}>
        {uploadFields.map((field, index) => (
          <div key={index}>
            <div className="mt-4 pr-4 pl-4">{field.label}</div>
            <input className="w-full h-10 px-3 py-2 mx-2 my-2 bg-gradient-to-r from-gray-900 to-black text-white rounded-lg border border-gray-400 shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" type="file" name="formfiles" disabled={isUploading} />
          </div>
        ))}
        <button
          className="hover:bg-[rgb(46,46,46)] disabled:bg-[rgb(92,0,0)] hover:shadow-[2px_2px_5px_gray] mx-2.5 my-2.5 px-1.5 py-1.5 border border-transparent hover:border-white rounded-[10px] text-[gainsboro] hover:text-white transition-all duration-200"
          type="submit"
          disabled={isUploading}
        >
          {isUploading ? loc('UploadingPlzWait') : loc('Upload')}
        </button>
      </form>
    </div>
  );
}
