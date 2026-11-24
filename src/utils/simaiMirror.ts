/**
 * simai 谱面文本的镜像 / 旋转。
 *
 * 只改"位置"相关的字符，其余字节原样通过：
 *   - 数字 `1`–`8`：按键位置，按角度映射
 *   - `<` `>` `p` `q` `s` `z`：slide 的方向符号，镜像时翻转手性
 *   - 触控区 `A1`–`E8`：字母不动，数字按同一套映射；`C` 不变
 * 注释（`||`）、`{拍号}`、`(BPM)`、`[时长/流速]` 一律不碰。
 *
 * 角度约定来自 geometry.js：`laneAngle(i) = (i - 0.5) × 45°`，lane 1 在上右、顺时针。
 * 五种操作当成角度变换后反解回 lane：
 *
 *   水平镜像 θ→−θ        1..8 → 8 7 6 5 4 3 2 1
 *   垂直镜像 θ→180°−θ    1..8 → 4 3 2 1 8 7 6 5
 *   180°     θ→θ+180°    1..8 → 5 6 7 8 1 2 3 4
 *   旋转 +45 θ→θ+45°     1..8 → 2 3 4 5 6 7 8 1
 *   旋转 −45 θ→θ−45°     1..8 → 8 1 2 3 4 5 6 7
 */

export type MirrorKind = 'lr' | 'ud' | '180' | 'cw45' | 'ccw45';

/** 下标 = 原 lane - 1 */
const LANE_MAP: Record<MirrorKind, readonly number[]> = {
  lr: [8, 7, 6, 5, 4, 3, 2, 1],
  ud: [4, 3, 2, 1, 8, 7, 6, 5],
  '180': [5, 6, 7, 8, 1, 2, 3, 4],
  cw45: [2, 3, 4, 5, 6, 7, 8, 1],
  ccw45: [8, 1, 2, 3, 4, 5, 6, 7],
};

/** 镜像翻转手性；旋转保持手性 */
const MIRRORED: Record<MirrorKind, boolean> = { lr: true, ud: true, '180': true, cw45: false, ccw45: false };

/** 镜像下的方向符号替换。`pp`/`qq` 逐字符替换后自然得到 `qq`/`pp`；`^` `v` `V` `w` `-` 不变 */
const FLIP: Record<string, string> = { '<': '>', '>': '<', p: 'q', q: 'p', s: 'z', z: 's' };

/** 括号内容原样跳过：BPM / 拍号 / 时长 / 流速 */
const CLOSERS: Record<string, string> = { '(': ')', '{': '}', '[': ']' };

const isLane = (char: string) => char >= '1' && char <= '8';

export function transformFumen(text: string, kind: MirrorKind): string {
  const lanes = LANE_MAP[kind];
  const flip = MIRRORED[kind];
  let out = '';
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    // 注释：到行尾原样带走
    if (char === '|' && text[index + 1] === '|') {
      const end = text.indexOf('\n', index);
      const stop = end === -1 ? text.length : end;
      out += text.slice(index, stop);
      index = stop;
      continue;
    }

    // 括号块原样带走（找到对应的闭括号即可，simai 里不嵌套）
    const closer = CLOSERS[char];
    if (closer) {
      const end = text.indexOf(closer, index + 1);
      const stop = end === -1 ? text.length : end + 1;
      out += text.slice(index, stop);
      index = stop;
      continue;
    }

    if (isLane(char)) {
      out += String(lanes[char.charCodeAt(0) - 49]);
      index += 1;
      continue;
    }

    out += flip && FLIP[char] ? FLIP[char] : char;
    index += 1;
  }

  return out;
}

/** 两种镜像组合、或八次同向旋转都会回到原样，测试里用它做自洽检查 */
export const MIRROR_KINDS: readonly MirrorKind[] = ['lr', 'ud', '180', 'cw45', 'ccw45'];
