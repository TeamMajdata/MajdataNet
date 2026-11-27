import { useState } from 'react';
import SectionLoading from '@/components/ui/SectionLoading';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { PageLayout, LoadingSpinner } from '@/components';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';
import { LuCircleCheck, LuMonitorSmartphone, LuTriangleAlert } from 'react-icons/lu';
import type { ReactNode } from 'react';
import * as retCode from '@/config/apiRetCode';

interface MachineAuthInfo {
  granteeInfo: {
    name: string;
    description: string;
    place: string;
    remoteIP: string;
  };
}

const fetcher = async (url: string): Promise<MachineAuthInfo> => {
  const res = await fetch(url, { mode: 'cors', credentials: 'include' });
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & {
      info?: unknown;
      status?: number;
    };
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export default function QRAuthPage() {
  const [searchParams] = useSearchParams();
  const authId = searchParams.get('auth-id');

  return (
    <PageLayout centered>
      <div className="flex justify-center items-center mx-auto px-1 py-10 w-full max-w-md">
        <PermitLogin authId={authId} />
      </div>
    </PageLayout>
  );
}

/** 卡片顶部的圆形图标 */
function StatusIcon({ tone, children }: { tone: 'blue' | 'green' | 'red'; children: ReactNode }) {
  const color = { blue: 'bg-blue-500/15 text-blue-300', green: 'bg-emerald-500/15 text-emerald-300', red: 'bg-red-500/15 text-red-300' }[tone];
  return <span className={`place-items-center grid mx-auto mb-4 rounded-full w-12 h-12 ${color}`}>{children}</span>;
}

/** 无效链接、二维码失效、登录成功这类只有一句话的状态 */
function StatusCard({ tone, icon, title, hint }: { tone: 'green' | 'red'; icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className={`${CARD_SURFACE_CLASS} p-8 w-full text-center`} role="status">
      <StatusIcon tone={tone}>{icon}</StatusIcon>
      <h1 className="m-0 font-semibold text-white! text-xl! text-center!">{title}</h1>
      {hint && <p className="m-0 mt-2 text-white/55! text-sm">{hint}</p>}
    </div>
  );
}

function PermitLogin({ authId }: { authId: string | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, error, isLoading } = useSWR<MachineAuthInfo>(
    authId ? endpoints.machine.authInfo(authId) : null,
    fetcher
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!authId) {
    return <StatusCard tone="red" icon={<LuTriangleAlert aria-hidden="true" className="w-6 h-6" />} title={t('qrauth/QRAuthPage.InvalidLink')} hint={t('qrauth/QRAuthPage.MissingAuthId')} />;
  }

  if (isLoggedIn) {
    return <StatusCard tone="green" icon={<LuCircleCheck aria-hidden="true" className="w-6 h-6" />} title={t('qrauth/QRAuthPage.Success')} />;
  }

  if (isLoading) {
    return <SectionLoading />;
  }

  if (error) {
    return <StatusCard tone="red" icon={<LuTriangleAlert aria-hidden="true" className="w-6 h-6" />} title={t('qrauth/QRAuthPage.InvalidCode')} hint={t('qrauth/QRAuthPage.InvalidCodeHint')} />;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!authId) return;
    setSubmitting(true);
    try {
      await permit(authId);
    } finally {
      setSubmitting(false);
    }
  }

  async function permit(id: string) {
    const response = await fetch(endpoints.machine.authPermit(id), {
      method: 'POST',
      credentials: 'include',
    });

    if (response.status !== 200) {
      if (response.status === 204) {
        toast.error(t('qrauth/QRAuthPage.AlreadyApproved'));
        return;
      }
      const rsp = await response.json();
      switch (rsp.code) {
        case retCode.CODE_NOT_LOGGED_IN:
          toast.error(t('qrauth/QRAuthPage.LoginFirst'));
          navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
          break;
        case retCode.CODE_PERMISSION_DENIED:
          toast.error(t('qrauth/QRAuthPage.PermissionDenied'));
          break;
        case retCode.CODE_ERROR:
          toast.error(t('qrauth/QRAuthPage.NoSuchCode'));
          break;
        default:
          toast.error(t('qrauth/QRAuthPage.TryAgain'));
          break;
      }
      return;
    }

    setIsLoggedIn(true);
  }

  const rows = [
    { label: t('qrauth/QRAuthPage.Machine'), value: data?.granteeInfo.name, detail: data?.granteeInfo.description },
    { label: t('qrauth/QRAuthPage.Place'), value: data?.granteeInfo.place, detail: data?.granteeInfo.remoteIP },
  ];

  return (
    <form onSubmit={onSubmit} className={`${CARD_SURFACE_CLASS} p-6 sm:p-8 w-full`}>
      <div className="mb-6 text-center">
        <StatusIcon tone="blue"><LuMonitorSmartphone aria-hidden="true" className="w-6 h-6" /></StatusIcon>
        <h1 className="m-0 font-semibold text-white! text-xl! text-center!">{t('qrauth/QRAuthPage.Title')}</h1>
        <p className="m-0 mt-1.5 text-white/55! text-sm">{t('qrauth/QRAuthPage.Subtitle')}</p>
      </div>

      {/* 机台和地点：标签在上，名称和补充信息在下 */}
      <dl className="flex flex-col gap-3 m-0">
        {rows.map(({ label, value, detail }) => (
          <div key={label} className="bg-white/[0.03] px-4 py-3 border border-white/10 rounded-xl min-w-0">
            <dt className="text-white/45 text-xs">{label}</dt>
            <dd className="m-0 mt-1 font-medium text-white/90 text-sm break-words">{value || '—'}</dd>
            {detail && <dd className="m-0 mt-0.5 text-white/50 text-xs break-words">{detail}</dd>}
          </div>
        ))}
      </dl>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex justify-center items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-60 mt-6 border-none rounded-xl w-full h-11 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {submitting && <LoadingSpinner size={16} />}
        {t('qrauth/QRAuthPage.Confirm')}
      </button>
    </form>
  );
}
