/**
 * Majdata 组件 - Unity WebGL 展示
 * 迁移自 legacy/src/app/widgets/Majdata.jsx
 */

import { Unity, useUnityContext } from 'react-unity-webgl';
import { useEffect } from 'react';
import type { MajdataProps } from '@/types';

// 扩展 window 对象类型
declare global {
  interface Window {
    unitySendMessage?: (
      gameObjectName: string,
      methodName: string,
      value: string
    ) => void;
  }
}

export default function Majdata({ songid, chartRoot: apiroot, level }: MajdataProps) {
  const buildUrl = '/WebGLBuild'; // replace with your CDN

  const { unityProvider, isLoaded, loadingProgression, sendMessage } = useUnityContext({
    loaderUrl: buildUrl + '/Build.loader.js',
    dataUrl: buildUrl + '/Build.data',
    frameworkUrl: buildUrl + '/Build.framework.js',
    codeUrl: buildUrl + '/Build.wasm',
  });

  // Wait for the Unity receiver before sending the first selection. A selection
  // change during startup replaces the pending load; after startup clicks send directly.
  useEffect(() => {
    if (!isLoaded || window.unitySendMessage === sendMessage) return;
    const timer = window.setTimeout(() => {
      const chart = new URL(apiroot.replace(/\/$/, '') + '/' + songid, location.origin);
      sendMessage(
        'HandleJSMessages',
        'ReceiveMessage',
        [chart + '/chart', chart + '/track', chart + '/image?fullImage=true', chart + '/video', level].join('\n'),
      );
      window.unitySendMessage = sendMessage;
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isLoaded, songid, apiroot, level, sendMessage]);

  useEffect(() => () => {
    if (window.unitySendMessage === sendMessage) delete window.unitySendMessage;
  }, [sendMessage]);

  return (
    <div className='top-0 z-100 box-border [@media(screen_and_(aspect-ratio>=2/3))]:static sticky bg-black p-2.5 rounded-[10px] w-full aspect-square min-[700px]:transform-none'>
      <Unity
        unityProvider={unityProvider}
        className="rounded-[10px] w-full h-full"
        style={{ display: isLoaded ? 'unset' : 'none' }}
      />
      <div
        className="w-full h-full text-center leading-80"
        style={{ display: isLoaded ? 'none' : 'block' }}
      >
        Loading Majdata {`${(loadingProgression * 100).toFixed(2)}% ..`}
      </div>
    </div>
  );
}
