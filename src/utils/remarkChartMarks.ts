/**
 * remark 插件：把评论里的谱面位置标记转成链接，点了跳到预览播放器的对应位置。
 *
 * - 时间：m:ss 或 mm:ss（0:25、1:25、01:25），秒必须是 00–59；12:30:45 这种多段的不算
 * - combo：数字后面跟 cb 或 combo，不分大小写，中间可以有一个空格（200cb、200 combo）
 *
 * 只处理 text 节点，代码和已有链接里的保持原样。是否在谱面范围内要等渲染时对照当前谱面判断，
 * 这里只负责找出来；链接地址见 chartMarkHref。
 */
import { chartMarkHref } from '@/components/song/chartMarks';

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

// 前后不能紧挨着数字或冒号（排除 12:30:45、1.5:30 之类）；combo 前不能是字母数字，后面不能接字母
const MARK = /(?<![\d:.])(\d{1,2}):([0-5]\d)(?![\d:])|(?<![\w.])(\d{1,5}) ?(?:combo|cb)(?![a-z])/gi;

function splitMarks(value: string): MdNode[] {
  const nodes: MdNode[] = [];
  let last = 0;
  for (const match of value.matchAll(MARK)) {
    const start = match.index;
    if (start > last) nodes.push({ type: 'text', value: value.slice(last, start) });
    const mark = match[1] !== undefined
      ? { kind: 'time' as const, value: Number(match[1]) * 60 + Number(match[2]) }
      : { kind: 'combo' as const, value: Number(match[3]) };
    nodes.push({ type: 'link', url: chartMarkHref(mark), children: [{ type: 'text', value: match[0] }] });
    last = start + match[0].length;
  }
  if (last === 0) return [{ type: 'text', value }];
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) });
  return nodes;
}

function visit(node: MdNode) {
  if (!node.children || node.type === 'link' || node.type === 'linkReference') return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && child.value) return splitMarks(child.value);
    visit(child);
    return [child];
  });
}

export default function remarkChartMarks() {
  return (tree: MdNode) => visit(tree);
}
