import { useMemo, useState } from 'react';
import type { DocNavNode } from '@/types';

interface DocSidebarProps {
  items: DocNavNode[];
  currentSlug: string;
  onNavigate: (slug: string) => void;
}

interface SidebarNodeProps {
  node: DocNavNode;
  depth: number;
  currentSlug: string;
  onNavigate: (slug: string) => void;
}

function SidebarNode({ node, depth, currentSlug, onNavigate }: SidebarNodeProps) {
  const defaultOpen = useMemo(() => {
    if (!node.children?.length) return false;
    return node.children.some((child) => child.slug === currentSlug);
  }, [node.children, currentSlug]);

  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = Boolean(node.children?.length);
  const isActive = Boolean(node.slug && node.slug === currentSlug);

  return (
    <li>
      <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 10}px` }}>
        {hasChildren ? (
          <button
            className="w-5 text-white/60 hover:text-white"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'collapse' : 'expand'}
          >
            {open ? '-' : '+'}
          </button>
        ) : (
          <span className="inline-block w-5" />
        )}

        {node.slug ? (
          <button
            onClick={() => onNavigate(node.slug!)}
            className={`flex-1 rounded px-2 py-1 text-left text-sm transition-colors ${isActive
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
          >
            {node.title}
          </button>
        ) : (
          <span className="flex-1 px-2 py-1 font-medium text-white/80 text-sm">{node.title}</span>
        )}
      </div>

      {hasChildren && open && (
        <ul className="space-y-1 mt-1">
          {node.children!.map((child) => (
            <SidebarNode
              key={`${child.title}-${child.slug ?? 'group'}`}
              node={child}
              depth={depth + 1}
              currentSlug={currentSlug}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DocSidebar({ items, currentSlug, onNavigate }: DocSidebarProps) {
  return (
    <aside className="bg-black/30 p-3 md:p-4 border border-white/10 rounded-2xl">
      <ul className="space-y-1">
        {items.map((item) => (
          <SidebarNode
            key={`${item.title}-${item.slug ?? 'group'}`}
            node={item}
            depth={0}
            currentSlug={currentSlug}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </aside>
  );
}
