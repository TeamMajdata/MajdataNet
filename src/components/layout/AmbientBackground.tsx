/**
 * 全站背景：流动的极光。
 * 深色底上三团很大的蓝、青、紫色柔光，十几到几十秒一个来回地缓慢流动、互相混色。
 *
 * 纯 CSS：每团光是一个径向渐变（不用 filter: blur），动画只改 transform，交给 GPU 合成，
 * 几乎不占 CPU；“减少动态效果”时停在原位（index.css 里全局关掉了动画）。
 */
export default function AmbientBackground() {
  return (
    <div aria-hidden="true" className="-z-99 fixed inset-0 bg-[#12161d] overflow-hidden pointer-events-none">
      <div className="top-[-30%] left-[-15%] absolute bg-[radial-gradient(closest-side,rgb(56_120_255/0.30),rgb(56_120_255/0.08)_55%,transparent)] mix-blend-screen w-[75vmax] h-[60vmax] animate-[aurora-a_26s_ease-in-out_infinite_alternate]" />
      <div className="top-[-10%] right-[-25%] absolute bg-[radial-gradient(closest-side,rgb(34_211_238/0.20),rgb(34_211_238/0.05)_55%,transparent)] mix-blend-screen w-[70vmax] h-[55vmax] animate-[aurora-b_32s_ease-in-out_infinite_alternate]" />
      <div className="bottom-[-35%] left-[15%] absolute bg-[radial-gradient(closest-side,rgb(139_92_246/0.24),rgb(139_92_246/0.06)_55%,transparent)] mix-blend-screen w-[80vmax] h-[65vmax] animate-[aurora-c_38s_ease-in-out_infinite_alternate]" />
      {/* 页面下半部分压暗一点，长列表往下翻时背景不会太花 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgb(18_22_29/0.35)_70%,rgb(18_22_29/0.6)_100%)]" />
    </div>
  );
}
