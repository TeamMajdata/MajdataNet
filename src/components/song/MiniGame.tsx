/**
 * MiniGame 组件
 */
import { useTranslation } from 'react-i18next';
import { Unity, useUnityContext } from 'react-unity-webgl';

export default function MiniGame() {
  const { t } = useTranslation();
  const buildUrl = '/MiniGame';

  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: buildUrl + '/H5.loader.js',
    dataUrl: buildUrl + '/H5.data',
    frameworkUrl: buildUrl + '/H5.framework.js',
    codeUrl: buildUrl + '/H5.wasm',
  });

  const percent = Math.round(loadingProgression * 100);

  return (
    <div className="relative bg-black mx-auto rounded-2xl w-full max-w-[640px] aspect-[4/3] overflow-hidden">
      <Unity
        unityProvider={unityProvider}
        className="w-full h-full"
        style={{ visibility: isLoaded ? 'visible' : 'hidden' }}
      />
      {/* 加载中：进度条和百分比居中显示在游戏画面上 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col justify-center items-center gap-3" role="status">
          <p className="m-0 text-white/70! text-sm">{t('minigame/MiniGamePage.Loading', { percent })}</p>
          <div className="bg-white/10 rounded-full w-48 h-1.5 overflow-hidden">
            <div className="bg-blue-400 rounded-full h-full transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
