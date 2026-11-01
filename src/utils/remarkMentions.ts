/**
 * remark 插件：把正文里的 @用户名 转成指向个人空间的链接
 *
 * 只处理 text 节点，代码、行内代码和已有链接里的 @ 保持原样；
 * 生成的链接带 mention 类名，渲染时据此区分样式。
 */

// 只描述插件用到的 mdast 结构，避免引入 @types/mdast
interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
  data?: {
    hProperties?: Record<string, unknown>;
  };
}

// 前面紧跟字母数字或 @ 的不算（邮箱之类）
const MENTION = /(?<![\w@])@[a-zA-Z0-9_-]{1,24}/g;

function splitMentions(value: string): MdNode[] {
  const nodes: MdNode[] = [];
  let last = 0;
  for (const match of value.matchAll(MENTION)) {
    const start = match.index;
    if (start > last) nodes.push({ type: 'text', value: value.slice(last, start) });
    nodes.push({
      type: 'link',
      url: `/space?id=${encodeURIComponent(match[0].slice(1))}`,
      children: [{ type: 'text', value: match[0] }],
      data: { hProperties: { className: ['mention'] } },
    });
    last = start + match[0].length;
  }
  if (last === 0) return [{ type: 'text', value }];
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) });
  return nodes;
}

function visit(node: MdNode) {
  if (!node.children || node.type === 'link' || node.type === 'linkReference') return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && child.value) return splitMentions(child.value);
    visit(child);
    return [child];
  });
}

export default function remarkMentions() {
  return (tree: MdNode) => visit(tree);
}
