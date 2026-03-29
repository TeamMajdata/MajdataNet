/**
 * remark 插件：将 [c]...[/c] 语法块转换为居中 div
 *
 * 用法（在 markdown 中）：
 *   [c]
 *   ## 标题
 *   - 列表项
 *   [/c]
 *
 * 仅匹配单独成段的 [c] / [/c]，不处理内联场景，
 * 无需开启原始 HTML，无 XSS 风险。
 */

function isCenterStart(node: any): boolean {
  if (node.type !== 'paragraph' || !Array.isArray(node.children) || node.children.length !== 1) {
    return false;
  }
  const child = node.children[0];
  // 普通文本形式（理论上不太会出现，但保险起见保留）
  if (child.type === 'text' && child.value.trim() === '[c]') return true;
  // remark 将 [c] 解析为 linkReference，identifier 为 "c"
  if (child.type === 'linkReference' && child.identifier === 'c') return true;
  return false;
}

function isCenterEnd(node: any): boolean {
  if (node.type !== 'paragraph' || !Array.isArray(node.children) || node.children.length !== 1) {
    return false;
  }
  const child = node.children[0];
  if (child.type === 'text' && child.value.trim() === '[/c]') return true;
  // remark 将 [/c] 解析为 linkReference，identifier 为 "/c"
  if (child.type === 'linkReference' && child.identifier === '/c') return true;
  return false;
}

export default function remarkCenter() {
  return (tree: any) => {
    const result: any[] = [];
    let i = 0;

    while (i < tree.children.length) {
      const node = tree.children[i];

      if (isCenterStart(node)) {
        let j = i + 1;
        while (j < tree.children.length && !isCenterEnd(tree.children[j])) {
          j++;
        }

        result.push({
          type: 'centerBlock',
          children: tree.children.slice(i + 1, j),
          data: {
            hName: 'div',
            hProperties: { className: ['md-center'] },
          },
        });

        i = j + 1;
      } else {
        result.push(node);
        i++;
      }
    }

    tree.children = result;
  };
}
