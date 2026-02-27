/**
 * Majdata 组件 - Unity WebGL 展示
 * 迁移自 legacy/src/app/widgets/Majdata.jsx
 */

import { Unity, useUnityContext } from 'react-unity-webgl';
import { useEffect, useRef } from 'react';
import sleep from '@/utils/sleep';
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

export default function Majdata({ songid, apiroot, level }: MajdataProps) {
  const buildUrl = '/WebGLBuild'; // replace with your CDN
  const hasLoadedRef = useRef(false);

  const { unityProvider, isLoaded, loadingProgression, sendMessage } = useUnityContext({
    loaderUrl: buildUrl + '/Build.loader.js',
    dataUrl: buildUrl + '/Build.data',
    frameworkUrl: buildUrl + '/Build.framework.js',
    codeUrl: buildUrl + '/Build.wasm',
  });

  // 只在Unity加载完成时设置全局的sendMessage函数
  useEffect(() => {
    if (isLoaded) {
      window.unitySendMessage = sendMessage;
    }
  }, [isLoaded, sendMessage]);

  // 只在首次加载完成时调用load()
  useEffect(() => {
    async function load() {
      const httpprefix = location.protocol + '//' + location.host;
      let root = apiroot;
      if (!root.startsWith('http')) {
        root = httpprefix + root;
      }
      const maichart = root + '/maichart/' + songid;
      const maidata = maichart + '/chart';
      const track = maichart + '/track';
      const bg = maichart + '/image?fullImage=true';
      const mv = maichart + '/video';
      await sleep(500);
      if (songid !== undefined && apiroot !== undefined && level !== undefined) {
        sendMessage(
          'HandleJSMessages',
          'ReceiveMessage',
          `${maidata}\n${track}\n${bg}\n${mv}\n${level}`
        );
      }
    }

    if (isLoaded && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      load();
    }
  }, [isLoaded, songid, apiroot, level, sendMessage]);

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
