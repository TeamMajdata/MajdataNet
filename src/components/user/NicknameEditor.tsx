import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import { apiRequest } from '@/utils/apiClient';
import { getDisplayMessage } from '@/utils/httpMessage';

export default function NicknameEditor() {
  const { user, refetch } = useUserContext();
  const { t } = useTranslation();
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
      toast.success(t("user/IntroUploader.UploadSuccess"));
    } catch (error) {
      toast.error(getDisplayMessage(error, t("user/IntroUploader.UploadFailed")));
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="flex sm:flex-row flex-col gap-2 max-w-lg">
    <input key={user.nickname} name="nickname" defaultValue={user.nickname || user.username} autoComplete="nickname" required disabled={busy}
      aria-label={t("auth/AuthModal.Nickname")}
      className="sm:flex-1 bg-white/[0.04] focus:bg-white/[0.06] disabled:opacity-60 px-3.5 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full min-w-0 h-10 text-white text-sm transition-colors" />
    <button type="submit" disabled={busy} className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-4 border-none rounded-xl h-10 font-semibold text-white text-sm whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed">
      {busy ? t("user/NicknameEditor.Saving") : t("user/NicknameEditor.Save")}
    </button>
  </form>;
}
