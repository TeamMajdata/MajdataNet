/**
 * 全站背景：极光带。
 * 页面上方两条斜着的、模糊的青蓝 / 紫蓝色光带，缓慢地摆动、伸缩，往下渐渐融进深色底色。
 *
 * 纯 CSS：光带用 filter: blur 做柔边，动画只改 transform（will-change 让模糊只栅格化一次），
 * 几乎不占 CPU；“减少动态效果”时停在原位（index.css 里全局关掉了动画）。
 */
export default function AmbientBackground() {
  const band = 'absolute left-[-20%] w-[140%] h-[38vh] rounded-[50%] blur-[40px] opacity-55 mix-blend-screen will-change-transform';
  return (
    <div aria-hidden="true" className="-z-99 fixed inset-0 bg-[#0f131a] overflow-hidden pointer-events-none">
      <div className={`${band} top-[-8vh] bg-[linear-gradient(90deg,transparent,rgb(40_200_170/0.55),rgb(70_120_255/0.55),transparent)] motion-safe:animate-[aurora-band-a_18s_ease-in-out_infinite_alternate]`} />
      <div className={`${band} top-[4vh] bg-[linear-gradient(90deg,transparent_10%,rgb(130_90_255/0.45),rgb(60_180_255/0.35),transparent_90%)] motion-safe:animate-[aurora-band-b_24s_ease-in-out_infinite_alternate]`} />
      {/* 往下渐渐融进底色，内容区域保持干净 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,#0f131a_65%)]" />
    </div>
  );
}
