import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { PageLayout, LoadingSpinner } from '@/components';
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
    <PageLayout className="flex justify-center items-center min-h-[60vh]">
      <PermitLogin authId={authId} />
    </PageLayout>
  );
}

function PermitLogin({ authId }: { authId: string | null }) {
  const navigate = useNavigate();
  const { data, error, isLoading } = useSWR<MachineAuthInfo>(
    authId ? endpoints.machine.authInfo(authId) : null,
    fetcher
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!authId) {
    return (
      <div className="auth-container">
        <div className="bg-surface shadow-card p-8 border border-line rounded-xl text-center">
          <h2 className="mb-2 font-bold text-ink text-2xl">❌ 无效的链接</h2>
          <p className="text-ink-3">缺少 auth-id 参数</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="bg-surface shadow-card p-8 border border-line rounded-xl text-center">
          <h2 className="mb-2 font-bold text-ink text-2xl">✅ 登录成功</h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="bg-surface shadow-card p-8 border border-line rounded-xl text-center">
          <h2 className="mb-2 font-bold text-ink text-2xl">❌ 二维码无效 ❌</h2>
          <p className="text-ink-3">尝试刷新二维码</p>
        </div>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!authId) return;
    const response = await fetch(endpoints.machine.authPermit(authId), {
      method: 'POST',
      credentials: 'include',
    });

    if (response.status !== 200) {
      if (response.status === 204) {
        toast.error('已批准过了');
        return;
      }
      const rsp = await response.json();
      switch (rsp.code) {
        case retCode.CODE_NOT_LOGGED_IN:
          toast.error('请先登录');
          navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
          break;
        case retCode.CODE_PERMISSION_DENIED:
          toast.error('权限不足');
          break;
        case retCode.CODE_ERROR:
          toast.error('没有这个二维码');
          break;
        default:
          toast.error('请重试');
          break;
      }
      return;
    }

    setIsLoggedIn(true);
  }

  return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <div
        className="bg-surface shadow-card p-8 border border-line rounded-xl w-full max-w-md"
        style={{ animation: 'slideInUp 0.6s ease-out 0.2s both' }}
      >
        <div className="mb-6 text-center">
          <h2 className="mb-1 font-bold text-ink text-2xl">确认登录吗？</h2>
          <p className="text-ink-3 text-sm">请检查以下机台信息</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="bg-surface-2 p-4 border border-line rounded-lg">
            <label className="block mb-1 font-semibold text-ink-2 text-xs uppercase tracking-wider">
              机台信息
            </label>
            <p className="text-ink">{data?.granteeInfo.name}</p>
            <p className="text-ink-3 text-sm">{data?.granteeInfo.description}</p>
          </div>

          <div className="bg-surface-2 p-4 border border-line rounded-lg">
            <label className="block mb-1 font-semibold text-ink-2 text-xs uppercase tracking-wider">
              登录地点
            </label>
            <p className="text-ink">{data?.granteeInfo.place}</p>
            <p className="text-ink-3 text-sm">{data?.granteeInfo.remoteIP}</p>
          </div>

          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover mt-2 py-3 rounded-md font-semibold text-white transition-colors cursor-pointer"
          >
            确认登录
          </button>
        </form>
      </div>
    </div>
  );
}
