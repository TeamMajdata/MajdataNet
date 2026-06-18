import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { endpoints } from '@/config/api';
import { useLoc, useUserContext } from '@/hooks';
import { getDisplayMessage } from '@/utils';

export default function NicknameEditor() {
  const loc = useLoc();
  const { user } = useUserContext();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isUploading, setIsUploading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const content = formData.get('content') as string;

    if (!content || content.trim() === '') {
      toast.error(loc('NicknameRequired', 'Please enter a nickname'));
      return;
    }

    const uploading = toast.loading(loc('Uploading'), {
      hideProgressBar: false,
    });

    setIsUploading(true);

    try {
      await axios.post(endpoints.account.nickname, { content }, {
        withCredentials: true,
      });
      toast.success(loc('UploadSuccess', 'Nickname updated successfully'));
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown }; message?: string };
      const message = getDisplayMessage(
        error.response?.data ?? error.message,
        loc('UploadFailed', 'Update failed'),
      );
      toast.error(message, { autoClose: false });
    } finally {
      toast.done(uploading);
      setIsUploading(false);
    }
  }

  return (
    <form className="flex flex-col" onSubmit={onSubmit}>
      <p className="mb-3 text-[#a0a0a0] text-sm leading-relaxed">
        {loc('NicknameHint', 'Your display name shown across the site.')}
      </p>
      <div className="flex gap-3 items-start">
        <input
          className="bg-black shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] px-4 py-2.5 border border-white/15 focus:border-[#3b82f6] rounded-lg focus:outline-none w-full max-w-md font-['Consolas',monospace] text-white text-sm caret-white transition-colors"
          name="content"
          type="text"
          maxLength={24}
          placeholder={loc('NicknamePlaceholder', 'Enter nickname...')}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={isUploading}
        />
        <button
          className="hover:bg-[#3b82f6] bg-[#3b82f6]/80 disabled:bg-[rgb(92,0,0)] px-6 py-2.5 rounded-lg font-medium text-sm text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
          type="submit"
          disabled={isUploading}
        >
          {isUploading ? loc('UploadingPlzWait') : loc('Save', 'Save')}
        </button>
      </div>
    </form>
  );
}
