/**
 * Monaco（Monarch）用的 simai token 规则，scope 命名沿用 MajdataEdit-Neo 的 simai.tmLanguage.json，
 * 规则内容对应本仓库 src/majview/simai.js 的解析逻辑。
 *
 * Monarch 按数组顺序逐条尝试、第一个匹配即采用（monaco 源码 monarchLexer 里是 for + break），
 * 所以顺序就是优先级，不能随意调整：
 * - `1-2[4:1]` 必须先匹配 slide，否则会被 tap 的 `[1-8]{1,2}` 截成 `1`；
 * - `6h[4:1]` / `A1h[4:1]` 必须在 tap 前匹配 hold / touch；
 * - `E7` 是 touch，单独的 `E` 才是结束标记，因此 touch 在 end 之前。
 *
 * 只用于展示当前难度的谱面内容，所以不需要处理 `&title=` 之类的字段（那些行不会进来）。
 */
export const SIMAI_TOKEN_RULES: readonly (readonly [RegExp, string])[] = [
  [/\|\|.*/, 'comment'],
  [/\([^)]*\)/, 'bpm'],
  [/\{[^}]*\}/, 'measure'],
  [/<?HS\*[^>]*>/, 'speed'],
  [/\[[^\]]*\]/, 'period'],
  [/E(?![0-9A-Za-z])/, 'end'],
  [/(?:C[1-8]?[hbfx]*|[ABDE][1-8][hbfx]*)/, 'touch'],
  [/[1-8][bx]*h[bx]*/, 'hold'],
  // 带 b（break）的滑动：b 可能出现在起点（8b-5）、路径末尾（2bV47b）、
  // 也可能在 [8:5] 这种括号之后（6p3[8:5]b），整段都算 break
  [/[1-8]b[bxm]*(?:[<>^\-vpqszwV][qp]?[1-8]+b?)+/, 'break'],
  [/[1-8][bxm]*(?:[<>^\-vpqszwV][qp]?[1-8]+)+b/, 'break'],
  [/[1-8][bxm]*(?:[<>^\-vpqszwV][qp]?[1-8]+)+\[\d+:\d+\]b/, 'break'],
  [/[1-8][bxm]*(?:[<>^\-vpqszwV][qp]?[1-8]+)+/, 'slide'],
  [/(?:[<>^\-vpqszwV][qp]?[1-8]+b)+/, 'break'],
  [/(?:[<>^\-vpqszwV][qp]?[1-8]+)+/, 'slide'],
  // 地雷 / break：时间轴上用 OrangeRed 画，这里单独成一个 token
  [/[1-8]{1,2}b[bxmf$]*/, 'break'],
  [/[1-8]{1,2}[bxmf$]*/, 'tap'],
  [/b+/, 'break'],
  [/[xfm$]+/, 'modifier'],
  [/\//, 'each'],
  [/[,`*]/, 'delimiter'],
];
