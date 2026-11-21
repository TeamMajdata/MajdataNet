/**
 * 全站背景：极光带。
 * 页面上方三条斜着的、模糊的光带（青蓝、紫蓝、粉紫），各自以不同节奏左右飘动、伸缩弯曲、明暗呼吸，
 * 往下渐渐融进深色底色。
 *
 * 纯 CSS：光带用 filter: blur 做柔边，动画只改 transform 和 opacity（will-change 让模糊只栅格化一次），
 * 几乎不占 CPU；“减少动态效果”时停在原位（index.css 里全局关掉了动画）。
 */
export default function AmbientBackground() {
  const band = 'absolute left-[-25%] w-[150%] rounded-[50%] blur-[42px] mix-blend-screen will-change-[transform,opacity]';
  return (
    <div aria-hidden="true" className="-z-99 fixed inset-0 bg-[#0f131a] overflow-hidden pointer-events-none">
      <div className={`${band} top-[-10vh] h-[36vh] bg-[linear-gradient(90deg,transparent,rgb(40_200_170/0.6),rgb(70_120_255/0.6),transparent)] opacity-60 rotate-[-6deg] motion-safe:animate-[aurora-band-a_9s_ease-in-out_infinite_alternate]`} />
      <div className={`${band} top-[2vh] h-[34vh] bg-[linear-gradient(90deg,transparent_10%,rgb(130_90_255/0.5),rgb(60_180_255/0.4),transparent_90%)] opacity-55 rotate-[4deg] motion-safe:animate-[aurora-band-b_12s_ease-in-out_infinite_alternate]`} />
      <div className={`${band} top-[14vh] h-[24vh] bg-[linear-gradient(90deg,transparent_20%,rgb(220_100_220/0.35),rgb(110_90_255/0.35),transparent_80%)] opacity-40 rotate-[-2deg] motion-safe:animate-[aurora-band-c_15s_ease-in-out_infinite_alternate]`} />
      {/* 往下渐渐融进底色，内容区域保持干净 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,#0f131a_70%)]" />
    </div>
  );
}
