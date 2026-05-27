import React from 'react';

// ======================== Detection ========================

const TMP_TAG_RE = /<(\/?)([a-zA-Z]\w*)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?(?:\s+\w+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/g;

export function hasTmpTags(text: string): boolean {
  if (!text) return false;
  TMP_TAG_RE.lastIndex = 0;
  return TMP_TAG_RE.test(text);
}

export function stripTmpTags(text: string): string {
  if (!text) return '';
  TMP_TAG_RE.lastIndex = 0;
  return text.replace(TMP_TAG_RE, '');
}

// ======================== Tokenizer ========================

interface Token {
  kind: 'text';
  content: string;
}

interface TagToken {
  kind: 'tag';
  isClose: boolean;
  tagName: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
}

type AnyToken = Token | TagToken;

const SELF_CLOSING = new Set(['br', 'sprite']);

function tokenize(text: string): AnyToken[] {
  const tokens: AnyToken[] = [];
  let last = 0;

  // Match any TMP tag. Group 1: /, Group 2: tag body (name or name=val), Group 3: extra attrs
  const re = /<(\/?)([a-zA-Z]\w*(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)((?:\s+\w+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ kind: 'text', content: text.slice(last, m.index) });
    }

    const isClose = m[1] === '/';
    const orig = m[2];
    const extra = m[3];
    const selfClose = m[4] === '/';

    // Split inline value: "color=#FF0000" -> tag=color, value=#FF0000
    const eq = orig.indexOf('=');
    const tagName = (eq !== -1 ? orig.slice(0, eq) : orig).toLowerCase();

    // Build attributes: inline value + extra attrs
    const attrs: Record<string, string> = {};
    if (eq !== -1) {
      attrs._value = orig.slice(eq + 1).replace(/^["']|["']$/g, '');
    }
    // Parse extra attributes: key="val" key='val' key=val
    const attrRe = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(extra)) !== null) {
      attrs[am[1].toLowerCase()] = am[2] ?? am[3] ?? am[4];
    }

    tokens.push({
      kind: 'tag',
      isClose,
      tagName,
      attrs,
      selfClosing: selfClose || SELF_CLOSING.has(tagName),
    });

    last = m.index + m[0].length;
  }

  if (last < text.length) {
    tokens.push({ kind: 'text', content: text.slice(last) });
  }

  return tokens;
}

// ======================== Tree Builder ========================

interface TmpNode {
  text?: string;
  tag?: string;
  attrs?: Record<string, string>;
  children: TmpNode[];
}

function buildTree(tokens: AnyToken[]): TmpNode[] {
  const root: TmpNode[] = [];
  const stack: TmpNode[] = [];

  for (const tok of tokens) {
    if (tok.kind === 'text') {
      const node: TmpNode = { text: tok.content, children: [] };
      (stack.length > 0 ? stack[stack.length - 1].children : root).push(node);
    } else if (!tok.isClose) {
      const node: TmpNode = { tag: tok.tagName, attrs: tok.attrs, children: [] };
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        root.push(node);
      }
      if (!tok.selfClosing) {
        stack.push(node);
      }
    } else {
      // Pop stack until we find the matching open tag
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tok.tagName) {
          stack.splice(i);
          break;
        }
      }
    }
  }

  return root;
}

// ======================== Style Builder ========================

function buildStyle(tag: string, attrs?: Record<string, string>): React.CSSProperties {
  const s: React.CSSProperties = {};
  const v = attrs?._value;

  switch (tag) {
    case 'b':
      s.fontWeight = 'bold';
      break;
    case 'i':
    case 'italic':
      s.fontStyle = 'italic';
      break;
    case 'u':
      s.textDecoration = 'underline';
      break;
    case 's':
    case 'strikethrough':
      s.textDecoration = 'line-through';
      break;
    case 'sub':
      s.verticalAlign = 'sub';
      s.fontSize = '0.75em';
      break;
    case 'sup':
      s.verticalAlign = 'super';
      s.fontSize = '0.75em';
      break;
    case 'color':
      if (v) {
        s.color = v;
      }
      break;
    case 'size': {
      if (!v) break;
      if (v.startsWith('+') || v.startsWith('-')) {
        // Relative: ±N px → scale percentage (Unity TMP default ≈ 36pt, so 1pt ≈ 2.8%)
        const rel = parseFloat(v);
        s.fontSize = `${100 + rel * 3}%`;
      } else if (v.includes('%')) {
        s.fontSize = v;
      } else {
        const num = parseFloat(v);
        if (!isNaN(num)) s.fontSize = `${num * 2.8}%`;
      }
      break;
    }
    case 'font':
      if (v) s.fontFamily = v;
      break;
    case 'alpha':
      if (v) {
        const a = v.startsWith('#') ? parseInt(v.slice(1), 16) / 255 : parseFloat(v);
        if (!isNaN(a)) s.opacity = Math.max(0, Math.min(1, a));
      }
      break;
    case 'mark':
      if (v) s.backgroundColor = v;
      break;
    case 'cspace':
      if (v) s.letterSpacing = v;
      break;
    case 'nobr':
      s.whiteSpace = 'nowrap';
      break;
    case 'smallcaps':
      s.fontVariant = 'small-caps';
      break;
    case 'uppercase':
    case 'allcaps':
      s.textTransform = 'uppercase';
      break;
    case 'lowercase':
      s.textTransform = 'lowercase';
      break;
    case 'rotate':
      if (v) {
        s.transform = `rotate(${parseFloat(v) || 0}deg)`;
        s.display = 'inline-block';
      }
      break;
    case 'indent':
      if (v) s.paddingLeft = v;
      break;
    case 'line-height':
      if (v) s.lineHeight = v;
      break;
    case 'line-indent':
      if (v) s.textIndent = v;
      break;
    case 'margin':
      if (v) s.margin = v;
      break;
    case 'space':
      if (v) s.wordSpacing = v;
      break;
    case 'width':
      if (v) s.width = v;
      break;
    case 'voffset':
      if (v) s.verticalAlign = v;
      break;
    default:
      break;
  }

  return s;
}

// ======================== React Renderer ========================

function renderNode(node: TmpNode, i: number): React.ReactNode {
  if (node.text !== undefined) {
    return node.text;
  }

  if (node.tag === 'br') {
    return <br key={i} />;
  }

  const children = node.children.map((c, j) => renderNode(c, j));
  const style = buildStyle(node.tag || '', node.attrs);

  if (Object.keys(style).length === 0) {
    // No visual change — unwrap
    return <React.Fragment key={i}>{children}</React.Fragment>;
  }

  return React.createElement('span', { key: i, style }, ...children);
}

// ======================== Public API ========================

/**
 * Parse a TMP rich-text string into React nodes.
 * Returns plain string if no TMP tags are detected.
 */
export function parseTmpRichText(text: string): React.ReactNode {
  if (!text) return '';
  if (!hasTmpTags(text)) return text;

  try {
    const tokens = tokenize(text);
    const tree = buildTree(tokens);
    return tree.map((node, i) => renderNode(node, i));
  } catch {
    return stripTmpTags(text);
  }
}

/**
 * React component that renders TMP rich text.
 * Falls back to a plain <span> with the stripped text if parsing fails.
 */
export function TmpRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const rendered = parseTmpRichText(text);
  if (rendered === text) {
    return <>{text}</>;
  }
  return <span className={className}>{rendered}</span>;
}
