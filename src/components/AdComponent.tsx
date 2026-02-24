import { useEffect } from 'react';

/**
 * 广告组件
 * 用于显示 Google AdSense 广告
 */
export default function AdComponent() {
  useEffect(() => {
    // 加载 AdSense 脚本
    if (window.adsbygoogle && !(window.adsbygoogle as any).loaded) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-format="fluid"
      data-ad-layout-key="-d9+97-36-cl+yp"
      data-ad-client="ca-pub-7973799234411834"
      data-ad-slot="8735501370"
    />
  );
}
