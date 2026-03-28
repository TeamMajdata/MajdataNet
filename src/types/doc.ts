export interface DocNavNode {
  title: string;
  slug?: string;
  description?: string;
  children?: DocNavNode[];
}

export interface DocStructure {
  title?: string;
  items: DocNavNode[];
}

export interface FlatDocItem {
  title: string;
  slug: string;
  description?: string;
  parentTitles: string[];
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface DocSearchItem {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
}

export interface DocPagination {
  prev: FlatDocItem | null;
  next: FlatDocItem | null;
}
