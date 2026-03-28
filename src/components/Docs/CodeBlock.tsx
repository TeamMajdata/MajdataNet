import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
}

export default function CodeBlock({ className, children, inline }: CodeBlockProps) {
  const code = String(children ?? '').replace(/\n$/, '');

  if (inline) {
    return <code className={className}>{children}</code>;
  }

  const language = className?.match(/language-([\w-]+)/)?.[1];
  const highlighted = language && hljs.getLanguage(language)
    ? hljs.highlight(code, { language }).value
    : hljs.highlightAuto(code).value;

  return (
    <pre className="docs-code-block bg-black/35 p-4 border border-white/10 rounded-xl overflow-x-auto">
      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}
