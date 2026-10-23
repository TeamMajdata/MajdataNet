import { useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { endpoints } from '@/config/api';
import { useI18n, useUserContext } from '@/hooks';
import { apiRequest } from '@/utils/apiClient';
import { getDisplayMessage } from '@/utils/httpMessage';

export default function NicknameEditor() {
  const { user, refetch } = useUserContext();
  const { i18n } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const nickname = String(form.get('nickname') ?? '').trim();
    if (!nickname) return;
    form.set('nickname', nickname);
    setBusy(true);
    try {
      await apiRequest(endpoints.account.updateProfile, { method: 'POST', body: form });
      await refetch();
      toast.success(i18n("user/IntroUploader.UploadSuccess"));
    } catch (error) {
      toast.error(getDisplayMessage(error, i18n("user/IntroUploader.UploadFailed")));
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="flex flex-col sm:flex-row items-end gap-4">
    <label className="flex-1 flex flex-col gap-2 w-full text-white">
      <span>{i18n("auth/ForginsterPage.Nickname")}</span>
      <input key={user.nickname} name="nickname" defaultValue={user.nickname || user.username} autoComplete="nickname" required disabled={busy}
        className="bg-black/60 p-3 border border-white/20 rounded-xl w-full" />
    </label>
    <button type="submit" disabled={busy} className="bg-blue-600 disabled:opacity-50 px-5 py-3 rounded-xl text-white">
      {busy ? i18n("user/IntroUploader.UploadingPlzWait") : i18n("user/IntroUploader.Upload")}
    </button>
  </form>;
}
