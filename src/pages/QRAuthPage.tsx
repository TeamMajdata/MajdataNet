import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiroot3 } from '@/config/api';
import { PageLayout } from '@/components';
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
    authId ? apiroot3 + '/machine/auth/info?auth-id=' + authId : null,
    fetcher
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!authId) {
    return (
      <div className="auth-container">
        <div className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md p-8 border border-white/10 rounded-2xl text-center">
          <h2 className="mb-2 font-bold text-[#e5e5e5] text-2xl">❌ 无效的链接</h2>
          <p className="text-gray-400">缺少 auth-id 参数</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md p-8 border border-white/10 rounded-2xl text-center">
          <h2 className="mb-2 font-bold text-[#e5e5e5] text-2xl">✅ 登录成功</h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-12 h-12 animate-[spin_0.1s_linear_infinite]" />
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md p-8 border border-white/10 rounded-2xl text-center">
          <h2 className="mb-2 font-bold text-[#e5e5e5] text-2xl">❌ 二维码无效 ❌</h2>
          <p className="text-gray-400">尝试刷新二维码</p>
        </div>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const response = await fetch(apiroot3 + '/machine/auth/permit?auth-id=' + authId, {
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
          navigate('/login');
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
        className="bg-[rgba(255,255,255,0.05)] shadow-2xl backdrop-blur-md p-8 border border-white/10 rounded-2xl w-full max-w-md"
        style={{ animation: 'slideInUp 0.6s ease-out 0.2s both' }}
      >
        <div className="mb-6 text-center">
          <h2 className="mb-1 font-bold text-[#e5e5e5] text-2xl">确认登录吗？</h2>
          <p className="text-gray-400 text-sm">请检查以下机台信息</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
            <label className="block mb-1 font-semibold text-gray-300 text-xs uppercase tracking-wider">
              机台信息
            </label>
            <p className="text-[#e5e5e5]">{data?.granteeInfo.name}</p>
            <p className="text-gray-400 text-sm">{data?.granteeInfo.description}</p>
          </div>

          <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
            <label className="block mb-1 font-semibold text-gray-300 text-xs uppercase tracking-wider">
              登录地点
            </label>
            <p className="text-[#e5e5e5]">{data?.granteeInfo.place}</p>
            <p className="text-gray-400 text-sm">{data?.granteeInfo.remoteIP}</p>
          </div>

          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 mt-2 py-3 rounded-xl font-semibold text-white transition-colors cursor-pointer"
          >
            确认登录
          </button>
        </form>
      </div>
    </div>
  );
}
