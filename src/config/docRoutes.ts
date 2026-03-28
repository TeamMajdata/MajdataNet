import type { DocNavNode, DocPagination, FlatDocItem } from '@/types';

export function normalizeDocSlug(slug: string | undefined | null): string {
  if (!slug) return 'index';
  const normalized = slug.trim().replace(/^\/+/g, '').replace(/\/+$/g, '');
  return normalized.length > 0 ? normalized : 'index';
}

export function flattenDocNodes(nodes: DocNavNode[], parentTitles: string[] = []): FlatDocItem[] {
  const result: FlatDocItem[] = [];

  for (const node of nodes) {
    const currentParents = [...parentTitles];

    if (node.slug) {
      result.push({
        title: node.title,
        slug: normalizeDocSlug(node.slug),
        description: node.description,
        parentTitles: currentParents,
      });
      currentParents.push(node.title);
    } else {
      currentParents.push(node.title);
    }

    if (node.children?.length) {
      result.push(...flattenDocNodes(node.children, currentParents));
    }
  }

  return result;
}

export function getDocPagination(items: FlatDocItem[], slug: string): DocPagination {
  const normalizedSlug = normalizeDocSlug(slug);
  const currentIndex = items.findIndex((item) => item.slug === normalizedSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? items[currentIndex - 1] : null,
    next: currentIndex < items.length - 1 ? items[currentIndex + 1] : null,
  };
}
