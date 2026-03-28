import { useEffect, useState } from 'react';
import { useLoc } from '@/hooks';
import type { TocHeading } from '@/types';

interface DocTableOfContentsProps {
  headings: TocHeading[];
}

export default function DocTableOfContents({ headings }: DocTableOfContentsProps) {
  const loc = useLoc();
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) {
      setActiveId('');
      return;
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-25% 0px -65% 0px',
        threshold: [0.1, 0.25, 0.5],
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="top-[calc(var(--header-height)+1rem)] sticky bg-black/30 p-4 border border-white/10 rounded-2xl">
      <h3 className="mb-3 font-semibold text-white text-base">{loc('DocsOnThisPage', 'On this page')}</h3>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 2 ? '' : heading.level === 3 ? 'pl-3' : 'pl-6'}>
            <a
              href={`#${heading.id}`}
              className={`block rounded px-2 py-1 text-sm transition-colors ${activeId === heading.id
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-white/75 hover:bg-white/8 hover:text-white'
                }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
