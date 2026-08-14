import { useState } from 'react';
import { toast } from 'react-toastify';
import axios, { AxiosError } from 'axios';
import { endpoints } from '@/config/api';
import { useLoc } from '@/hooks';
import { getDisplayMessage, sleep } from '@/utils';
import { motion } from 'framer-motion';
import { MdOutlineAudioFile, MdOutlineDescription, MdOutlineImage, MdOutlineVideoFile, MdCloudUpload } from 'react-icons/md';
import { LoadingSpinner } from '@/components';

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
      const response = await axios.post(endpoints.maichart.upload, formData, {
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
    { label: 'maidata.txt', icon: <MdOutlineDescription className="text-ink-3 group-hover:text-primary text-2xl transition-colors" /> },
    { label: 'bg.png/bg.jpg', icon: <MdOutlineImage className="text-ink-3 group-hover:text-primary text-2xl transition-colors" /> },
    { label: 'track.mp3', icon: <MdOutlineAudioFile className="text-ink-3 group-hover:text-primary text-2xl transition-colors" /> },
    { label: loc('BGVideoHint'), icon: <MdOutlineVideoFile className="text-ink-3 group-hover:text-primary text-2xl transition-colors" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto px-4 py-8 w-full max-w-4xl"
    >
      <div className="p-6 md:p-8">

        <div className="flex items-center gap-3 mb-6 pb-4 border-line border-b">
          <div className="bg-primary-soft p-2 rounded-md">
            <MdCloudUpload className="text-primary text-2xl" />
          </div>
          <h2 className="font-bold text-ink text-xl">
            {loc('Upload') || 'Upload Chart'}
          </h2>
        </div>

        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {uploadFields.map((field, index) => (
              <div key={index} className="group">
                <label className="flex items-center gap-2 mb-2 font-medium text-ink-2 group-hover:text-ink text-sm transition-colors duration-200">
                  {field.icon}
                  {field.label}
                </label>
                <div className="relative bg-surface-2 border border-line group-hover:border-primary/50 rounded-lg overflow-hidden transition-all duration-200">
                  <input
                    className="bg-transparent hover:file:bg-primary-soft file:bg-surface file:mr-4 px-4 file:px-3 py-3 file:py-1.5 file:border-0 file:rounded-md focus:outline-none w-full file:font-semibold text-ink hover:file:text-primary file:text-ink-2 file:text-xs text-sm transition-colors cursor-pointer"
                    type="file"
                    name="formfiles"
                    disabled={isUploading}
                  />
                </div>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`mt-4 w-full py-3 rounded-md font-bold text-white transition-colors duration-200 flex items-center justify-center gap-2 shadow-card
              ${isUploading
                ? 'bg-surface-2 text-ink-3 cursor-not-allowed opacity-70'
                : 'bg-primary hover:bg-primary-hover'
              }`}
            type="submit"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <LoadingSpinner className="w-5 h-5 text-white" />
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

