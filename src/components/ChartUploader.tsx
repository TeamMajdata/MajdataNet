import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { endpoints } from '@/config/api';
import { useLoc } from '@/hooks';
import { sleep } from '@/utils';
import { motion } from 'framer-motion';
import { MdOutlineAudioFile, MdOutlineDescription, MdOutlineImage, MdOutlineVideoFile, MdCloudUpload } from 'react-icons/md';
import LoadingSpinner from '@/components/LoadingSpinner';

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
    { label: 'maidata.txt', icon: <MdOutlineDescription className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
    { label: 'bg.png/bg.jpg', icon: <MdOutlineImage className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
    { label: 'track.mp3', icon: <MdOutlineAudioFile className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
    { label: loc('BGVideoHint'), icon: <MdOutlineVideoFile className="text-gray-400 group-hover:text-white text-2xl transition-colors" /> },
  ];

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
                    disabled={isUploading}
                  />
                </div>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`mt-4 w-full py-3 rounded-xl font-bold text-gray-200 shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border border-white/5
              ${isUploading
                ? 'bg-red-900/50 cursor-not-allowed opacity-70'
                : 'bg-[#2e2e2e] hover:bg-[#3a3a3a] hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              }`}
            type="submit"
            disabled={isUploading}
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

