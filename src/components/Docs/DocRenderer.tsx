import { useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import GithubSlugger from 'github-slugger';
import 'github-markdown-css/github-markdown-dark.css';
import CodeBlock from './CodeBlock';
import type { TocHeading } from '@/types';

interface DocRendererProps {
  content: string;
  onHeadingsChange: (headings: TocHeading[]) => void;
}

function extractText(input: React.ReactNode): string {
  if (typeof input === 'string' || typeof input === 'number') {
    return String(input);
  }

  if (Array.isArray(input)) {
    return input.map(extractText).join('');
  }

  if (input && typeof input === 'object' && 'props' in input) {
    const props = (input as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }

  return '';
}

function cleanHeadingText(raw: string): string {
  return raw
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

function extractHeadings(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  const regex = /^(#{1,4})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = cleanHeadingText(match[2]);
    const id = slugger.slug(text);

    if (level >= 2 && level <= 4) {
      headings.push({ id, text, level });
    }
  }

  return headings;
}

export default function DocRenderer({ content, onHeadingsChange }: DocRendererProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  useEffect(() => {
    onHeadingsChange(headings);
  }, [headings, onHeadingsChange]);

  const slugger = new GithubSlugger();

  return (
    <article className="bg-[rgb(15_15_20/75%)] p-6 md:p-10 border border-white/10 rounded-2xl markdown-body docs-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1(props) {
            const id = slugger.slug(cleanHeadingText(extractText(props.children)));
            return <h1 id={id} className="text-left scroll-mt-24" {...props} />;
          },
          h2(props) {
            const id = slugger.slug(cleanHeadingText(extractText(props.children)));
            return <h2 id={id} className="text-left scroll-mt-24" {...props} />;
          },
          h3(props) {
            const id = slugger.slug(cleanHeadingText(extractText(props.children)));
            return <h3 id={id} className="text-left scroll-mt-24" {...props} />;
          },
          h4(props) {
            const id = slugger.slug(cleanHeadingText(extractText(props.children)));
            return <h4 id={id} className="text-left scroll-mt-24" {...props} />;
          },
          code(props) {
            return <CodeBlock {...props} />;
          },
        }}
      >
        {content}
      </Markdown>
    </article>
  );
}
