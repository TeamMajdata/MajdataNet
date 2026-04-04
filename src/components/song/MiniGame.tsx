/**
 * MiniGame 组件
 * 迁移自 legacy/src/app/widgets/MiniGame.jsx
 */
import { Unity, useUnityContext } from 'react-unity-webgl';

export default function MiniGame() {
  const buildUrl = '/MiniGame';

  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: buildUrl + '/H5.loader.js',
    dataUrl: buildUrl + '/H5.data',
    frameworkUrl: buildUrl + '/H5.framework.js',
    codeUrl: buildUrl + '/H5.wasm',
  });

  return (
    <div className="bg-black mx-auto rounded-[10px] w-full max-w-[640px] h-auto aspect-[4/3]">
      <Unity
        unityProvider={unityProvider}
        className="rounded-[10px] w-full h-full"
        style={{ display: isLoaded ? 'unset' : 'none' }}
      />
      <div
        className="flex justify-center items-center rounded-[10px] w-full h-full text-white text-base"
        style={{ display: isLoaded ? 'none' : 'block' }}
      >
        Loading MiniGame {`${(loadingProgression * 100).toFixed(2)}% ..`}
      </div>
    </div>
  );
}
